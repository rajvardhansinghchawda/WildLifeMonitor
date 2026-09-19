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

    # ------------------------------------------------------------------ dispatch
    async def call(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name. Unknown tools/bad args return an error dict, never raise."""
        try:
            if name == "get_analysis_summary":
                return await self.get_analysis_summary(arguments.get("analysis_id"))
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
        except (TypeError, ValueError) as exc:
            return {"error": "bad_arguments", "message": str(exc)}
        return {"error": "unknown_tool", "message": f"No tool named {name!r}."}
