import hashlib
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple, cast

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)


def canonicalize_ring(
    ring_coords: List[List[float]], ccw: bool = True
) -> List[Tuple[float, float]]:
    """Normalize ring orientation and starting vertex without coordinate rounding.

    Contract (dsabackendoptimisation.md):
    - Exterior ring must be counter-clockwise (ccw=True).
    - Interior rings (holes) must be clockwise (ccw=False).
    - Starting vertex must be the lexicographically smallest coordinate.
    - No coordinate rounding.
    """
    if not ring_coords:
        return []

    # Ensure coordinates are (x, y) tuples
    coords = [(float(c[0]), float(c[1])) for c in ring_coords]

    # Remove duplicated closing vertex for rotation
    if len(coords) > 1 and coords[0] == coords[-1]:
        coords = coords[:-1]

    if not coords:
        return []

    # Compute signed area via shoelace formula
    n = len(coords)
    area2 = sum(
        coords[i][0] * coords[(i + 1) % n][1] - coords[(i + 1) % n][0] * coords[i][1]
        for i in range(n)
    )
    is_ccw = area2 > 0

    # Invert if orientation does not match desired
    if is_ccw != ccw:
        coords = list(reversed(coords))

    # Normalize vertex order: rotate list so lexicographically smallest coordinate is first
    min_idx = min(range(len(coords)), key=lambda i: (coords[i][0], coords[i][1]))
    rotated = coords[min_idx:] + coords[:min_idx]

    # Re-close ring
    rotated.append(rotated[0])
    return rotated


def compute_canonical_aoi_hash(aoi_dict: Dict[str, Any]) -> str:
    """Compute SHA-256 hash of canonicalized polygon geometry."""
    geom_type = aoi_dict.get("type", "Polygon")
    raw_coords = aoi_dict.get("coordinates", [])

    if geom_type == "Polygon" and raw_coords:
        canonical_rings = []
        # Exterior ring -> CCW
        exterior = canonicalize_ring(raw_coords[0], ccw=True)
        canonical_rings.append(exterior)

        # Interior rings -> CW
        for interior_ring in raw_coords[1:]:
            canonical_rings.append(canonicalize_ring(interior_ring, ccw=False))

        normalized_repr = json.dumps(
            {"type": "Polygon", "coordinates": canonical_rings},
            separators=(",", ":"),
        )
    else:
        normalized_repr = json.dumps(aoi_dict, sort_keys=True, separators=(",", ":"))

    return hashlib.sha256(normalized_repr.encode("utf-8")).hexdigest()


class ScientificCache:
    """Redis-backed scientific computation cache storing reusable analysis manifests and layer results.

    Contract (dsabackendoptimisation.md):
    - Separate from idempotency keys ('sci:...' vs 'idem:...').
    - Includes all 13 scientific variance inputs:
        1. workspacescope
        2. canonicalaoihash
        3. baselinestart
        4. baselineend
        5. comparisonstart
        6. comparisonend
        7. requestedlayers
        8. datasetrevisionorfreshnessbucket
        9. methodversion
        10. thresholdconfiguration
        11. maskconfiguration
        12. analysiscrs
        13. analysisresolution
    """

    KEY_PREFIX = "sci"
    DEFAULT_TTL_SECONDS = 86400 * 7  # 7 days

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self._redis = redis_client

    def _get_redis(self) -> redis.Redis:
        if self._redis is not None:
            return self._redis
        return cast(redis.Redis, redis.from_url(settings.REDIS_URL, decode_responses=True))

    def build_cache_key(
        self,
        workspace_id: uuid.UUID,
        aoi: Dict[str, Any],
        baseline_start: str,
        baseline_end: str,
        comparison_start: str,
        comparison_end: str,
        requested_layers: List[str],
        dataset_revision: str = "s2-l2a-v1",
        method_version: str = "v1",
        threshold_config: Optional[Dict[str, Any]] = None,
        mask_config: Optional[Dict[str, Any]] = None,
        analysis_crs: str = "EPSG:4326",
        analysis_resolution: float = 10.0,
    ) -> str:
        """Construct deterministic SHA-256 scientific cache key encompassing all variance factors."""
        aoi_hash = compute_canonical_aoi_hash(aoi)
        sorted_layers = sorted(requested_layers)
        norm_thresholds = json.dumps(threshold_config or {}, sort_keys=True, separators=(",", ":"))
        norm_masks = json.dumps(mask_config or {}, sort_keys=True, separators=(",", ":"))

        elements = [
            f"ws={workspace_id}",
            f"aoi={aoi_hash}",
            f"base={baseline_start}..{baseline_end}",
            f"comp={comparison_start}..{comparison_end}",
            f"layers={','.join(sorted_layers)}",
            f"ds={dataset_revision}",
            f"method={method_version}",
            f"thresh={norm_thresholds}",
            f"mask={norm_masks}",
            f"crs={analysis_crs}",
            f"res={analysis_resolution}",
        ]

        raw_key = "|".join(elements)
        composite_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        return f"{self.KEY_PREFIX}:{composite_hash}"

    async def get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached scientific result manifest if available."""
        r = self._get_redis()
        raw = await r.get(cache_key)
        if not raw:
            return None
        try:
            return cast(Optional[Dict[str, Any]], json.loads(raw))
        except json.JSONDecodeError:
            return None

    async def set_cached_result(
        self,
        cache_key: str,
        manifest_data: Dict[str, Any],
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> None:
        """Store completed scientific result manifest in cache."""
        r = self._get_redis()
        serialized = json.dumps(manifest_data, separators=(",", ":"))
        await r.set(cache_key, serialized, ex=ttl_seconds)
        logger.info("Stored scientific cache entry %s (TTL=%ds)", cache_key, ttl_seconds)
