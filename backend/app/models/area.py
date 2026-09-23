import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class ProtectedArea(Base):
    """Global reference catalog of protected areas (real boundaries from OpenStreetMap).

    Not workspace-scoped: every authenticated user can browse the catalog.
    `statistics` / `timeline` hold real, precomputed Earth Engine outputs with their
    computation timestamps — never placeholder values.
    """

    __tablename__ = "protected_areas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    designation = Column(String(255), nullable=True)
    iucn_category = Column(String(20), nullable=True)
    country = Column(String(120), nullable=True, index=True)
    country_code = Column(String(3), nullable=True)
    state = Column(String(120), nullable=True)
    biome = Column(String(120), nullable=True)
    wdpa_id = Column(String(40), nullable=True)
    osm_type = Column(String(20), nullable=True)
    osm_id = Column(String(40), nullable=True)

    area_km2 = Column(Float, nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    boundary = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)
    # AOI actually submitted to analyses for this area (<= MAX_AOI_KM2)
    analysis_aoi = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)
    analysis_aoi_note = Column(String(500), nullable=True)

    source = Column(String(255), nullable=False, default="OpenStreetMap contributors")
    source_fetched_at = Column(DateTime(timezone=True), nullable=True)

    statistics = Column(JSONB, nullable=True)
    statistics_computed_at = Column(DateTime(timezone=True), nullable=True)
    timeline = Column(JSONB, nullable=True)
    timeline_computed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
