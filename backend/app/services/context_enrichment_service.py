import logging
import math
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

from shapely import STRtree
from shapely.geometry import LineString, Point, shape
from shapely.geometry.base import BaseGeometry

from app.core.config import settings

logger = logging.getLogger(__name__)


def haversine_distance_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Compute great-circle distance between two WGS84 coordinates in meters."""
    r_meters = 6371008.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_meters * c


class ContextEnrichmentService:
    """Service enriching change events with proximity to known infrastructure using spatial trees.

    DSA & Scientific Invariants (dsabackendoptimisation.md, systemdesign.md):
    - Uses a spatial-tree (STRtree) to batch nearest-neighbor searches across all events in an analysis.
    - Single cached fetch per analysis AOI (O(1) query count), not N queries for N events.
    - Field naming strictly distinguishes 'nearest known feature in our cached source'
      from any claim of absolute real-world absence.
    - Context failures produce warnings and never invalidate an otherwise-ready change layer.
    """

    CONTEXT_SOURCE = "cached_osm_overpass_v1"  # fixture mode (tests) only
    LIVE_CONTEXT_SOURCE = "openstreetmap_overpass_live"
    OVERPASS_MIRRORS = (
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    )
    CACHE_TTL_SECONDS = 24 * 3600
    _cache: Dict[str, Tuple[float, Tuple[List[BaseGeometry], List[BaseGeometry]]]] = {}
    _cache_lock = threading.Lock()

    @property
    def context_source(self) -> str:
        return (
            self.CONTEXT_SOURCE
            if settings.PROVIDER_MODE.lower() == "fixture"
            else self.LIVE_CONTEXT_SOURCE
        )
    DISCLAIMER = (
        "Distances indicate proximity to nearest known features in the cached OpenStreetMap Overpass source; "
        "absence of features in this source is not proof that no road or settlement exists in the physical world."
    )

    def __init__(self):
        self.query_count = 0  # Monitored in automated tests to verify batching

    def fetch_cached_context_features(
        self, aoi: Dict[str, Any]
    ) -> Tuple[List[BaseGeometry], List[BaseGeometry]]:
        """Retrieve cached context features for an AOI.

        Simulates or executes cached Overpass query with query count tracking.
        Returns: (roads_list, settlements_list)
        """
        self.query_count += 1
        geom = shape(aoi)
        min_lon, min_lat, max_lon, max_lat = geom.bounds
        if settings.PROVIDER_MODE.lower() != "fixture":
            return self._fetch_overpass(min_lon, min_lat, max_lon, max_lat)

        # Generate representative cached OSM roads and settlements within or near the AOI
        # Road: diagonal highway crossing the AOI
        road1 = LineString([(min_lon, min_lat), (max_lon, max_lat)])
        road2 = LineString(
            [(min_lon, (min_lat + max_lat) / 2.0), (max_lon, (min_lat + max_lat) / 2.0)]
        )
        roads: List[BaseGeometry] = [road1, road2]

        # Settlement: village center point near lower-left quadrant
        settlement1 = Point(
            min_lon + (max_lon - min_lon) * 0.25, min_lat + (max_lat - min_lat) * 0.25
        )
        settlements: List[BaseGeometry] = [settlement1]

        return roads, settlements

    def _fetch_overpass(
        self, min_lon: float, min_lat: float, max_lon: float, max_lat: float
    ) -> Tuple[List[BaseGeometry], List[BaseGeometry]]:
        """Fetch REAL roads and settlements around the AOI from OpenStreetMap (Overpass)."""
        pad = settings.CONTEXT_BUFFER_KM / 111.0
        south, west, north, east = min_lat - pad, min_lon - pad, max_lat + pad, max_lon + pad
        key = f"{south:.3f},{west:.3f},{north:.3f},{east:.3f}"
        now = time.time()
        with self._cache_lock:
            hit = self._cache.get(key)
            if hit and now - hit[0] < self.CACHE_TTL_SECONDS:
                return hit[1]

        query = (
            "[out:json][timeout:90];("
            'way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|'
            'residential|track|service|road|living_street)$"]'
            f"({south},{west},{north},{east});"
            'node["place"~"^(city|town|village|hamlet|isolated_dwelling)$"]'
            f"({south},{west},{north},{east});"
            ");out geom;"
        )
        endpoints = [settings.OVERPASS_ENDPOINT] + [
            m for m in self.OVERPASS_MIRRORS if m != settings.OVERPASS_ENDPOINT
        ]
        last_error: Optional[Exception] = None
        payload: Optional[Dict[str, Any]] = None
        for endpoint in endpoints:
            try:
                response = requests.post(
                    endpoint,
                    data={"data": query},
                    headers={"User-Agent": "CodeNiti-WildlifeMonitor/1.0 (conservation research)"},
                    timeout=120,
                )
                if response.status_code == 200:
                    payload = response.json()
                    break
                last_error = RuntimeError(f"Overpass HTTP {response.status_code} from {endpoint}")
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
        if payload is None:
            raise RuntimeError(f"Overpass unavailable: {last_error}")

        roads: List[BaseGeometry] = []
        settlements: List[BaseGeometry] = []
        for element in payload.get("elements", []):
            if element.get("type") == "way" and element.get("geometry"):
                coords = [(pt["lon"], pt["lat"]) for pt in element["geometry"]]
                if len(coords) >= 2:
                    roads.append(LineString(coords))
            elif element.get("type") == "node" and "lat" in element and "lon" in element:
                settlements.append(Point(element["lon"], element["lat"]))
        with self._cache_lock:
            self._cache[key] = (now, (roads, settlements))
        logger.info("Overpass returned %d roads and %d settlements", len(roads), len(settlements))
        return roads, settlements

    def enrich_events_batch(
        self,
        events: List[Dict[str, Any]],
        aoi: Dict[str, Any],
        simulate_context_failure: bool = False,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Enrich a batch of event dictionaries with spatial-tree nearest feature metrics.

        Returns: (enriched_events, warnings)
        """
        warnings: List[str] = []

        if simulate_context_failure:
            logger.warning(
                "Simulated context enrichment failure encountered. Emitting warning without failing layer."
            )
            warnings.append(
                "Context enrichment (infrastructure proximity) was unavailable for this run; "
                "change detection results remain valid."
            )
            # Retain events without distance enrichment
            for evt in events:
                evt["nearest_known_road_distance_m"] = None
                evt["nearest_known_settlement_distance_m"] = None
                evt["context_source"] = self.context_source
                evt["context_disclaimer"] = self.DISCLAIMER
            return events, warnings

        if not events:
            return events, warnings

        try:
            # 1. Single batched query for the entire analysis AOI
            roads, settlements = self.fetch_cached_context_features(aoi)

            if not roads:
                warnings.append(
                    "Cached context source returned zero known roads for this AOI. "
                    "An empty source response is not proof of absence in the physical world."
                )
            if not settlements:
                warnings.append(
                    "Cached context source returned zero known settlements for this AOI. "
                    "An empty source response is not proof of absence in the physical world."
                )

            # 2. Build spatial trees (STRtree)
            road_tree = STRtree(roads) if roads else None
            settlement_tree = STRtree(settlements) if settlements else None

            # 3. Compute event centroids
            event_centroids = []
            for evt in events:
                evt_geom = shape(evt["geometry"])
                event_centroids.append(evt_geom.centroid)

            # 4. Batch spatial tree nearest feature queries
            road_nearest_indices: Optional[Any] = (
                road_tree.nearest(event_centroids) if road_tree is not None else None
            )
            settlement_nearest_indices: Optional[Any] = (
                settlement_tree.nearest(event_centroids) if settlement_tree is not None else None
            )

            # 5. Enrich events with accurate geodesic distances in meters
            for i, evt in enumerate(events):
                centroid = event_centroids[i]

                # Nearest road distance
                road_dist: Optional[float] = None
                if road_tree is not None and road_nearest_indices is not None:
                    nearest_road_geom = roads[road_nearest_indices[i]]
                    # Nearest point on road to event centroid
                    p_nearest = nearest_road_geom.interpolate(nearest_road_geom.project(centroid))
                    road_dist = round(
                        haversine_distance_m(centroid.x, centroid.y, p_nearest.x, p_nearest.y),
                        1,
                    )

                # Nearest settlement distance
                settlement_dist: Optional[float] = None
                if settlement_tree is not None and settlement_nearest_indices is not None:
                    nearest_settlement_geom = settlements[settlement_nearest_indices[i]]
                    settlement_dist = round(
                        haversine_distance_m(
                            centroid.x,
                            centroid.y,
                            nearest_settlement_geom.x,
                            nearest_settlement_geom.y,
                        ),
                        1,
                    )

                evt["nearest_known_road_distance_m"] = road_dist
                evt["nearest_known_settlement_distance_m"] = settlement_dist
                evt["context_source"] = self.context_source
                evt["context_disclaimer"] = self.DISCLAIMER

        except Exception as e:
            logger.error("Context enrichment failed: %s", str(e), exc_info=True)
            warnings.append(
                f"Context enrichment encountered an internal error ({str(e)}); "
                "primary change detection results remain unaffected."
            )
            for evt in events:
                evt["nearest_known_road_distance_m"] = None
                evt["nearest_known_settlement_distance_m"] = None
                evt["context_source"] = self.context_source
                evt["context_disclaimer"] = self.DISCLAIMER

        return events, warnings
