"""Add context-enrichment proximity fields to change_events

Revision ID: 0002_event_context
Revises: 0001_baseline
Create Date: 2026-09-18

Persists the nearest-known-road / nearest-known-settlement distances that
ContextEnrichmentService already computes per event (app/services/context_enrichment_service.py)
so they survive past the worker run instead of being discarded, and so PriorityService can use
the real computed proximity data for the 'context' scoring component (superpower.md) instead of
requiring a separate, never-configured Workspace.settings['pressure_indicators'] value.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_event_context"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "change_events",
        sa.Column("nearest_known_road_distance_m", sa.Float(), nullable=True),
    )
    op.add_column(
        "change_events",
        sa.Column("nearest_known_settlement_distance_m", sa.Float(), nullable=True),
    )
    op.add_column(
        "change_events",
        sa.Column("context_source", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("change_events", "context_source")
    op.drop_column("change_events", "nearest_known_settlement_distance_m")
    op.drop_column("change_events", "nearest_known_road_distance_m")
