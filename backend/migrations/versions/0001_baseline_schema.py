"""Baseline database schema with PostGIS and required indexes

Revision ID: 0001_baseline
Revises:
Create Date: 2026-09-18 10:00:00.000000

"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable PostGIS Extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 2. Table: workspaces
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Table: memberships
    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )
    op.create_index("ix_memberships_workspace_id", "memberships", ["workspace_id"])
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])

    # 4. Table: aois
    op.create_table(
        "aois",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="POLYGON", srid=4326, from_text="ST_GeomFromEWKT", name="geometry"
            ),
            nullable=False,
        ),
        sa.Column("area_km2", sa.Float(), nullable=False),
        sa.Column("geom_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_aois_workspace_id", "aois", ["workspace_id"])
    op.create_index("ix_aois_geom_hash", "aois", ["geom_hash"])

    # 5. Table: analyses
    op.create_table(
        "analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("aoi_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("baseline_start", sa.Date(), nullable=False),
        sa.Column("baseline_end", sa.Date(), nullable=False),
        sa.Column("comparison_start", sa.Date(), nullable=False),
        sa.Column("comparison_end", sa.Date(), nullable=False),
        sa.Column("requested_layers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("configuration_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("stage", sa.String(length=100), nullable=True),
        sa.Column(
            "cancel_requested", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_analyses_workspace_id", "analyses", ["workspace_id"])
    op.create_index("ix_analyses_status", "analyses", ["status"])
    op.create_index("ix_analyses_idempotency_key", "analyses", ["idempotency_key"])
    # Required index from dsabackendoptimisation.md
    op.create_index(
        "analyses_workspace_created_idx",
        "analyses",
        ["workspace_id", sa.text("created_at DESC"), sa.text("id DESC")],
    )

    # 6. Table: analysis_layers
    op.create_table(
        "analysis_layers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("layer_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("quality_label", sa.String(length=50), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("error_details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("method_version", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_analysis_layers_analysis_id", "analysis_layers", ["analysis_id"])

    # 7. Table: job_attempts
    op.create_table(
        "job_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("worker_id", sa.String(length=255), nullable=True),
        sa.Column("fencing_token", sa.BigInteger(), nullable=False),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_job_attempts_analysis_id", "job_attempts", ["analysis_id"])

    # 8. Table: change_events
    op.create_table(
        "change_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "layer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analysis_layers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry(
                geometry_type="POLYGON", srid=4326, from_text="ST_GeomFromEWKT", name="geometry"
            ),
            nullable=False,
        ),
        sa.Column("change_type", sa.String(length=100), nullable=False),
        sa.Column("affected_area_ha", sa.Float(), nullable=False),
        sa.Column("mean_ndvi_change", sa.Float(), nullable=True),
        sa.Column("valid_pixel_fraction", sa.Float(), nullable=True),
        sa.Column("quality_label", sa.String(length=50), nullable=True),
        sa.Column("source_confidence", sa.String(length=50), nullable=True),
        sa.Column("priority_score", sa.Float(), nullable=True),
        sa.Column("priority_method_version", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("method_version", sa.String(length=50), nullable=False),
        sa.Column("record_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_change_events_workspace_id", "change_events", ["workspace_id"])
    op.create_index("ix_change_events_analysis_id", "change_events", ["analysis_id"])
    # Required indexes from dsabackendoptimisation.md
    op.create_index("events_geom_gist_idx", "change_events", ["geom"], postgresql_using="gist")
    op.create_index(
        "events_workspace_analysis_idx", "change_events", ["workspace_id", "analysis_id"]
    )
    op.create_index(
        "events_priority_idx",
        "change_events",
        ["workspace_id", "analysis_id", sa.text("priority_score DESC"), "id"],
    )

    # 9. Table: artifacts
    op.create_table(
        "artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "analysis_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analyses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_attempts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "layer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analysis_layers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("media_type", sa.String(length=100), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("object_key", name="uq_artifacts_object_key"),
    )
    op.create_index("ix_artifacts_workspace_id", "artifacts", ["workspace_id"])
    op.create_index("ix_artifacts_analysis_id", "artifacts", ["analysis_id"])

    # 10. Table: verifications
    op.create_table(
        "verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("change_events.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_id", sa.String(length=255), nullable=False),
        sa.Column("from_status", sa.String(length=50), nullable=False),
        sa.Column("to_status", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("decision", sa.String(length=100), nullable=True),
        sa.Column("record_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_verifications_event_id", "verifications", ["event_id"])

    # 11. Table: audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_id", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=100), nullable=False),
        sa.Column("target_id", sa.String(length=255), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_workspace_id", "audit_logs", ["workspace_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])

    # 12. Table: outbox
    op.create_table(
        "outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("message", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_outbox_topic", "outbox", ["topic"])
    op.create_index("ix_outbox_status", "outbox", ["status"])
    op.create_index("ix_outbox_published_at", "outbox", ["published_at"])
    op.create_index("outbox_published_created_idx", "outbox", ["published_at", "created_at"])


def downgrade() -> None:
    op.drop_table("outbox")
    op.drop_table("audit_logs")
    op.drop_table("verifications")
    op.drop_table("artifacts")
    op.drop_table("change_events")
    op.drop_table("job_attempts")
    op.drop_table("analysis_layers")
    op.drop_table("analyses")
    op.drop_table("aois")
    op.drop_table("memberships")
    op.drop_table("workspaces")
    # Leave postgis extension intact or drop if isolated
