"""Investigator portal: users, refresh tokens, protected areas, alerts, reports

Revision ID: 0003_investigator_portal
Revises: 0002_event_context
Create Date: 2026-09-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision: str = "0003_investigator_portal"
down_revision: Union[str, None] = "0002_event_context"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "protected_areas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("designation", sa.String(255), nullable=True),
        sa.Column("iucn_category", sa.String(20), nullable=True),
        sa.Column("country", sa.String(120), nullable=True),
        sa.Column("country_code", sa.String(3), nullable=True),
        sa.Column("state", sa.String(120), nullable=True),
        sa.Column("biome", sa.String(120), nullable=True),
        sa.Column("wdpa_id", sa.String(40), nullable=True),
        sa.Column("osm_type", sa.String(20), nullable=True),
        sa.Column("osm_id", sa.String(40), nullable=True),
        sa.Column("area_km2", sa.Float(), nullable=False),
        sa.Column("centroid_lat", sa.Float(), nullable=False),
        sa.Column("centroid_lon", sa.Float(), nullable=False),
        sa.Column(
            "boundary",
            Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column(
            "analysis_aoi",
            Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("analysis_aoi_note", sa.String(500), nullable=True),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("source_fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("statistics", postgresql.JSONB(), nullable=True),
        sa.Column("statistics_computed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timeline", postgresql.JSONB(), nullable=True),
        sa.Column("timeline_computed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_protected_areas_slug", "protected_areas", ["slug"], unique=True)
    op.create_index("ix_protected_areas_name", "protected_areas", ["name"])
    op.create_index("ix_protected_areas_country", "protected_areas", ["country"])
    op.execute(
        "CREATE INDEX protected_areas_boundary_gist_idx ON protected_areas USING GIST (boundary)"
    )

    op.add_column(
        "analyses",
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("protected_areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_analyses_area_id", "analyses", ["area_id"])

    op.add_column("change_events", sa.Column("properties", postgresql.JSONB(), nullable=True))
    op.add_column("analysis_layers", sa.Column("warnings", postgresql.JSONB(), nullable=True))
    op.add_column("analysis_layers", sa.Column("provenance", postgresql.JSONB(), nullable=True))

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("change_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("protected_areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_alerts_workspace_id", "alerts", ["workspace_id"])
    op.create_index("ix_alerts_event_id", "alerts", ["event_id"], unique=True)
    op.create_index("ix_alerts_analysis_id", "alerts", ["analysis_id"])
    op.create_index("ix_alerts_area_id", "alerts", ["area_id"])
    op.create_index("ix_alerts_status", "alerts", ["status"])
    op.create_index(
        "alerts_workspace_triggered_idx", "alerts", ["workspace_id", sa.text("triggered_at DESC")]
    )

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("protected_areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("object_key", sa.String(1024), nullable=True),
        sa.Column("byte_size", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("event_count", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_reports_workspace_id", "reports", ["workspace_id"])


def downgrade() -> None:
    op.drop_index("ix_reports_workspace_id", table_name="reports")
    op.drop_table("reports")
    op.drop_table("alerts")
    op.drop_column("analysis_layers", "provenance")
    op.drop_column("analysis_layers", "warnings")
    op.drop_column("change_events", "properties")
    op.drop_index("ix_analyses_area_id", table_name="analyses")
    op.drop_column("analyses", "area_id")
    op.execute("DROP INDEX IF EXISTS protected_areas_boundary_gist_idx")
    op.drop_table("protected_areas")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_column("workspaces", "is_public")
