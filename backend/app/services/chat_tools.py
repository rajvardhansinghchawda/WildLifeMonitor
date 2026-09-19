"""Read-only data tools for the "Ask the Habitat" chat agent.

Every tool wraps existing queries/builders (portal_queries, labels, models) and returns plain
JSON-serialisable dicts. Nothing here computes new science: the LLM may only narrate what these
tools return. A `ChatToolbox` is bound to one analysis and one caller's ReadScope, so tools can
never read another workspace or another analysis.
"""

import uuid
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.labels import CHANGE_TYPE_LABELS
from app.core.security import ReadScope
from app.models.analysis import Analysis
from app.models.area import ProtectedArea
from app.models.event import ChangeEvent
from app.services import portal_queries as pq

MAX_EVENTS = 25  # keeps tool results inside small free-tier token budgets
# Wording mandated by the chat system prompt (never "confirmed deforestation" etc.).
PROMPT_LABELS: Dict[str, str] = {
    "vegetationlosscandidate": "vegetation-loss candidate",
    "watergaincandidate": "water gain/loss",
    "waterlosscandidate": "water gain/loss",
    "builtupprobabilitychangecandidate": "built-up change candidate",
    "forestalert": "forest disturbance alert",
}
STATUS_LABELS: Dict[str, str] = {
    "pendingfieldverification": "pending field verification",
    "investigating": "investigating",
    "verifiedchange": "verified change",
    "dismissed": "dismissed",
    "inconclusive": "inconclusive",
}
OUT_OF_SCOPE = {
    "error": "outside_this_analysis",
    "message": "That analysis or event is outside the analysis this chat is bound to.",
}

TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_analysis_summary",
            "description": (
                "Layer statuses, metrics, warnings and observation windows for the analysis."
            ),
            "parameters": {
                "type": "object",
                "properties": {"analysis_id": {"type": "string"}},
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reserve_profile",
            "description": (
                "General reserve profile, total area km2, state, biome, precomputed statistics, "
                "and overall Habitat Health Index (0-100)."
            ),
            "parameters": {
                "type": "object",
                "properties": {"analysis_id": {"type": "string"}},
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_vegetation_loss_summary",
            "description": (
                "Aggregated summary of forest & canopy loss (total hectares affected, event count, "
                "average NDVI drop, largest disturbance patch, and top priority loss locations)."
            ),
            "parameters": {
                "type": "object",
                "properties": {"analysis_id": {"type": "string"}},
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_water_dynamics",
            "description": (
                "Water bodies dynamics: surface water area trends, drying vs expanding water bodies, "
                "NDWI metrics, and specific water change events."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "analysis_id": {"type": "string"},
                    "limit": {"type": "integer", "description": f"max {MAX_EVENTS}"},
                },
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": (
                "List change events (id, type, area_ha, confidence, priority_score, status, "
                "centroid) with optional filters."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "analysis_id": {"type": "string"},
                    "change_type": {
                        "type": "string",
                        "description": (
                            "vegetationlosscandidate | watergaincandidate | waterlosscandidate | "
                            "builtupprobabilitychangecandidate | forestalert"
                        ),
                    },
                    "min_priority": {"type": "number", "description": "0-100"},
                    "status": {"type": "string"},
                    "limit": {"type": "integer", "description": f"max {MAX_EVENTS}"},
                },
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_event_detail",
            "description": (
                "Full record for one event: provenance, method version, nearby context "
                "distances, priority components and verification history."
            ),
            "parameters": {
                "type": "object",
                "properties": {"event_id": {"type": "string"}},
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_priority_ranking",
            "description": "Events of the analysis sorted by investigation priority, highest first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "analysis_id": {"type": "string"},
                    "top_n": {"type": "integer", "description": f"max {MAX_EVENTS}"},
                },
                "required": ["analysis_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_monitored_reserves",
            "description": (
                "List monitored wildlife reserves and national parks in India with their state and area km2."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of reserves to list (max 40)"},
                },
            },
        },
    },
]


def _clamp(value: Any, default: int) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(MAX_EVENTS, n))


def _uuid(value: Any) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


class ChatToolbox:
    """Tools bound to one analysis + one caller's read scope."""

    def __init__(
        self,
        db: AsyncSession,
        scope: ReadScope,
        analysis_id: uuid.UUID,
        coord_precision: int = 5,
    ):
        self.db = db
        self.scope = scope
        self.analysis_id = analysis_id
        # Public (unauthenticated) chat generalises coordinates (~1 km) to protect wildlife locations.
        self.coord_precision = coord_precision
        self.seen_event_ids: Set[str] = set()
        self._analysis: Optional[Analysis] = None
        self._area_name: Optional[str] = None

    # ------------------------------------------------------------------ helpers
    async def _load(self) -> Optional[Analysis]:
        if self._analysis is None:
            self._analysis = (
                await self.db.execute(
                    select(Analysis)
                    .options(selectinload(Analysis.layers))
                    .where(
                        Analysis.id == self.analysis_id,
                        Analysis.workspace_id.in_(self.scope.workspace_ids),
                    )
                )
            ).scalar_one_or_none()
            if self._analysis is not None and self._analysis.area_id:
                self._area_name = (
                    await self.db.execute(
                        select(ProtectedArea.name).where(ProtectedArea.id == self._analysis.area_id)
                    )
                ).scalar_one_or_none()
        return self._analysis

    def _is_bound(self, analysis_id: Any) -> bool:
        if analysis_id in (None, ""):  # omitted -> the bound analysis
            return True
        return _uuid(analysis_id) == self.analysis_id

    def _event_row(self, event: ChangeEvent, analysis: Analysis) -> Dict[str, Any]:
        hs = pq.build_hotspot(
            event,
            analysis,
            self._area_name,
            [],
            read_only=analysis.workspace_id != self.scope.own_workspace_id,
            include_geometry=False,
        )
        ctype = str(event.change_type)
        self.seen_event_ids.add(str(event.id))
        return {
            "event_id": str(event.id),
            "change_type": ctype,
            "label": PROMPT_LABELS.get(ctype, CHANGE_TYPE_LABELS.get(ctype, ctype)),
            "area_ha": round(float(event.affected_area_ha), 4),  # type: ignore[arg-type]
            "confidence": {
                "source_confidence": event.source_confidence,
                "quality_label": event.quality_label,
                "valid_pixel_fraction": event.valid_pixel_fraction,
            },
            "priority_score": event.priority_score,
            "sensor": hs.sensor,
            "status": STATUS_LABELS.get(str(event.status), str(event.status)),
            "geometry_centroid": {
                "lat": round(hs.coordinates.lat, self.coord_precision),
                "lon": round(hs.coordinates.lon, self.coord_precision),
            },
        }

    async def _events(
        self,
        change_type: Optional[str],
        min_priority: Optional[float],
        status: Optional[str],
        limit: int,
        ranked: bool,
    ) -> Dict[str, Any]:
        analysis = await self._load()
        if analysis is None:
            return OUT_OF_SCOPE
        conditions: List[Any] = [ChangeEvent.analysis_id == self.analysis_id]
        if change_type:
            conditions.append(ChangeEvent.change_type == change_type)
        if status:
            conditions.append(ChangeEvent.status == status.replace(" ", "").lower())
        if min_priority is not None:
            conditions.append(ChangeEvent.priority_score >= float(min_priority))
        if ranked:
            conditions.append(ChangeEvent.priority_score.is_not(None))
            order = [ChangeEvent.priority_score.desc(), ChangeEvent.id]
        else:
            order = [ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.id]
        rows = (
            (await self.db.execute(select(ChangeEvent).where(*conditions).order_by(*order).limit(limit)))
            .scalars()
            .all()
        )
        total = (
            await self.db.execute(select(func.count(ChangeEvent.id)).where(*conditions))
        ).scalar_one()
        return {
            "analysis_id": str(self.analysis_id),
            "total_matching": int(total),
            "returned": len(rows),
            "note": "total_matching may exceed returned; results are capped per call.",
            "events": [self._event_row(e, analysis) for e in rows],
        }

    # ------------------------------------------------------------------ tools
    async def get_analysis_summary(self, analysis_id: Any) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        analysis = await self._load()
        if analysis is None:
            return OUT_OF_SCOPE
        layers = []
        for layer in analysis.layers:
            metrics = {
                k: v for k, v in dict(layer.metrics or {}).items() if k != "distributions"  # type: ignore[arg-type]
            }
            layers.append(
                {
                    "layer": layer.layer_type,
                    "status": layer.status,
                    "quality_label": layer.quality_label,
                    "method_version": layer.method_version,
                    "metrics": metrics,
                    "warnings": list(layer.warnings or []),  # type: ignore[arg-type]
                }
            )
        return {
            "analysis_id": str(analysis.id),
            "area_name": self._area_name,
            "status": analysis.status,
            "baseline_window": {"start": str(analysis.baseline_start), "end": str(analysis.baseline_end)},
            "comparison_window": {
                "start": str(analysis.comparison_start),
                "end": str(analysis.comparison_end),
            },
            "layers": layers,
        }

    async def get_events(
        self,
        analysis_id: Any,
        change_type: Optional[str] = None,
        min_priority: Optional[float] = None,
        status: Optional[str] = None,
        limit: Any = 10,
    ) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        return await self._events(change_type, min_priority, status, _clamp(limit, 10), ranked=False)

    async def get_priority_ranking(self, analysis_id: Any, top_n: Any = 10) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        return await self._events(None, None, None, _clamp(top_n, 10), ranked=True)

    async def get_event_detail(self, event_id: Any) -> Dict[str, Any]:
        parsed = _uuid(event_id)
        analysis = await self._load()
        if parsed is None or analysis is None:
            return OUT_OF_SCOPE
        event = (
            await self.db.execute(
                select(ChangeEvent)
                .options(selectinload(ChangeEvent.verifications))
                .where(ChangeEvent.id == parsed, ChangeEvent.analysis_id == self.analysis_id)
            )
        ).scalar_one_or_none()
        if event is None:
            return OUT_OF_SCOPE
        row = self._event_row(event, analysis)
        props: Dict[str, Any] = dict(event.properties or {})  # type: ignore[arg-type]
        layer = next((lyr for lyr in analysis.layers if lyr.id == event.layer_id), None)
        row.update(
            {
                "mean_ndvi_change": event.mean_ndvi_change,
                "baseline_value": props.get("baseline_value"),
                "comparison_value": props.get("comparison_value"),
                "value_name": props.get("value_name"),
                "priority_components": props.get("priority_components"),
                "priority_method_version": event.priority_method_version,
                "method_version": event.method_version,
                "provenance": {
                    "sensor": row.get("sensor"),
                    "layer_dataset": dict(layer.provenance or {}).get("dataset") if layer else None,  # type: ignore[arg-type]
                    "baseline_window": f"{analysis.baseline_start} to {analysis.baseline_end}",
                    "comparison_window": f"{analysis.comparison_start} to {analysis.comparison_end}",
                },
                "nearby_context": {
                    "nearest_known_road_distance_m": event.nearest_known_road_distance_m,
                    "nearest_known_settlement_distance_m": event.nearest_known_settlement_distance_m,
                    "context_source": event.context_source,
                    "note": "Proximity only; it does not imply any cause.",
                },
                "verifications": [
                    {
                        "from_status": v.from_status,
                        "to_status": v.to_status,
                        "notes": v.notes,
                        "at": v.created_at.isoformat(),
                    }
                    for v in sorted(event.verifications, key=lambda x: x.created_at, reverse=True)
                ],
            }
        )
        return row

    async def get_reserve_profile(self, analysis_id: Any) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        analysis = await self._load()
        if analysis is None:
            return OUT_OF_SCOPE
        area = None
        if analysis.area_id:
            area = (
                await self.db.execute(select(ProtectedArea).where(ProtectedArea.id == analysis.area_id))
            ).scalar_one_or_none()
        health = pq.health_for_analysis(analysis)
        stats = dict(area.statistics or {}) if area and area.statistics else {}
        return {
            "analysis_id": str(analysis.id),
            "reserve_name": area.name if area else (self._area_name or "Custom AOI"),
            "designation": area.designation if area else "Protected Area",
            "state": area.state if area else None,
            "country": area.country if area else "India",
            "biome": area.biome if area else None,
            "total_area_km2": round(float(area.area_km2), 2) if area and area.area_km2 else None,
            "centroid": {
                "lat": round(float(area.centroid_lat), self.coord_precision) if area and area.centroid_lat else None,
                "lon": round(float(area.centroid_lon), self.coord_precision) if area and area.centroid_lon else None,
            } if area else None,
            "habitat_health_index": health.get("score") if health else None,
            "health_rating": health.get("rating") if health else None,
            "health_components": health.get("components") if health else None,
            "key_statistics": {
                "mean_tree_canopy_percent": stats.get("tree_cover_percent") or stats.get("canopy_cover_percent"),
                "water_surface_ha": stats.get("water_surface_ha") or stats.get("water_area_ha"),
                "baseline_mean_ndvi": stats.get("baseline_mean_ndvi"),
            } if stats else {},
            "monitoring_status": analysis.status,
        }

    async def get_vegetation_loss_summary(self, analysis_id: Any) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        analysis = await self._load()
        if analysis is None:
            return OUT_OF_SCOPE
        veg_layer = next((lyr for lyr in analysis.layers if lyr.layer_type == "vegetation"), None)
        veg_metrics = dict(veg_layer.metrics or {}) if veg_layer and veg_layer.metrics else {}

        stats_row = (await self.db.execute(
            select(
                func.count(ChangeEvent.id),
                func.sum(ChangeEvent.affected_area_ha),
                func.avg(ChangeEvent.mean_ndvi_change),
                func.max(ChangeEvent.affected_area_ha),
            ).where(
                ChangeEvent.analysis_id == self.analysis_id,
                ChangeEvent.change_type.in_(["vegetationlosscandidate", "forestalert"]),
            )
        )).one()

        total_count = stats_row[0] or 0
        total_ha = round(float(stats_row[1] or 0.0), 2)
        avg_ndvi_drop = round(float(stats_row[2] or 0.0), 3) if stats_row[2] is not None else None
        max_single_patch_ha = round(float(stats_row[3] or 0.0), 2) if stats_row[3] is not None else 0.0

        top_events = (await self.db.execute(
            select(ChangeEvent)
            .where(
                ChangeEvent.analysis_id == self.analysis_id,
                ChangeEvent.change_type.in_(["vegetationlosscandidate", "forestalert"]),
            )
            .order_by(ChangeEvent.priority_score.desc().nulls_last(), ChangeEvent.affected_area_ha.desc())
            .limit(5)
        )).scalars().all()

        return {
            "analysis_id": str(self.analysis_id),
            "reserve_name": self._area_name,
            "layer_reported_loss_ha": veg_metrics.get("vegetationlossareaha"),
            "total_loss_candidate_ha": total_ha,
            "total_loss_events_count": int(total_count),
            "average_ndvi_drop": avg_ndvi_drop,
            "largest_single_loss_patch_ha": max_single_patch_ha,
            "top_priority_loss_locations": [self._event_row(e, analysis) for e in top_events],
            "observation_window": f"{analysis.comparison_start} vs {analysis.baseline_start}",
        }

    async def get_water_dynamics(self, analysis_id: Any, limit: Any = 10) -> Dict[str, Any]:
        if not self._is_bound(analysis_id):
            return OUT_OF_SCOPE
        analysis = await self._load()
        if analysis is None:
            return OUT_OF_SCOPE
        water_layer = next((lyr for lyr in analysis.layers if lyr.layer_type == "water"), None)
        water_metrics = dict(water_layer.metrics or {}) if water_layer and water_layer.metrics else {}

        ev_res = await self.db.execute(
            select(ChangeEvent)
            .where(
                ChangeEvent.analysis_id == self.analysis_id,
                ChangeEvent.change_type.in_(["watergaincandidate", "waterlosscandidate"]),
            )
            .order_by(ChangeEvent.affected_area_ha.desc(), ChangeEvent.id)
            .limit(_clamp(limit, 10))
        )
        events = ev_res.scalars().all()

        counts = (await self.db.execute(
            select(ChangeEvent.change_type, func.count(ChangeEvent.id), func.sum(ChangeEvent.affected_area_ha))
            .where(
                ChangeEvent.analysis_id == self.analysis_id,
                ChangeEvent.change_type.in_(["watergaincandidate", "waterlosscandidate"]),
            )
            .group_by(ChangeEvent.change_type)
        )).all()

        summary_by_type = {}
        for ctype, count, total_ha in counts:
            summary_by_type[ctype] = {
                "count": int(count),
                "total_area_ha": round(float(total_ha or 0.0), 2),
            }

        return {
            "analysis_id": str(self.analysis_id),
            "reserve_name": self._area_name,
            "water_layer_status": water_layer.status if water_layer else "not_requested",
            "water_layer_metrics": {
                k: v for k, v in water_metrics.items() if k != "distributions"
            },
            "water_summary": {
                "water_loss_drying_bodies": summary_by_type.get("waterlosscandidate", {"count": 0, "total_area_ha": 0.0}),
                "water_gain_expansion": summary_by_type.get("watergaincandidate", {"count": 0, "total_area_ha": 0.0}),
            },
            "events": [self._event_row(e, analysis) for e in events],
            "observation_window": f"{analysis.comparison_start} vs {analysis.baseline_start}",
        }

    async def list_monitored_reserves(self, limit: Any = 20) -> Dict[str, Any]:
        lim = max(1, min(40, int(limit or 20)))
        rows = (await self.db.execute(
            select(ProtectedArea.name, ProtectedArea.state, ProtectedArea.country, ProtectedArea.area_km2, ProtectedArea.designation)
            .order_by(ProtectedArea.name)
            .limit(lim)
        )).all()
        return {
            "total_available_in_catalog": len(rows),
            "reserves": [
                {
                    "name": r[0],
                    "state": r[1],
                    "country": r[2] or "India",
                    "area_km2": round(float(r[3]), 1) if r[3] else None,
                    "designation": r[4],
                }
                for r in rows
            ],
        }

    # ------------------------------------------------------------------ dispatch
    async def call(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name. Unknown tools/bad args return an error dict, never raise."""
        try:
            if name == "get_analysis_summary":
                return await self.get_analysis_summary(arguments.get("analysis_id"))
            if name == "get_reserve_profile":
                return await self.get_reserve_profile(arguments.get("analysis_id"))
            if name == "get_vegetation_loss_summary":
                return await self.get_vegetation_loss_summary(arguments.get("analysis_id"))
            if name == "get_water_dynamics":
                return await self.get_water_dynamics(arguments.get("analysis_id"), arguments.get("limit", 10))
            if name == "get_events":
                return await self.get_events(
                    arguments.get("analysis_id"),
                    arguments.get("change_type"),
                    arguments.get("min_priority"),
                    arguments.get("status"),
                    arguments.get("limit", 10),
                )
            if name == "get_event_detail":
                return await self.get_event_detail(arguments.get("event_id"))
            if name == "get_priority_ranking":
                return await self.get_priority_ranking(
                    arguments.get("analysis_id"), arguments.get("top_n", 10)
                )
            if name == "list_monitored_reserves":
                return await self.list_monitored_reserves(arguments.get("limit", 20))
        except (TypeError, ValueError) as exc:
            return {"error": "bad_arguments", "message": str(exc)}
        return {"error": "unknown_tool", "message": f"No tool named {name!r}."}
