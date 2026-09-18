"""Seed Admin and Workspace data: Users, Memberships, and Audit Logs.

Provides realistic accounts and administrative audit history for the Admin Portal.
"""

import asyncio
import datetime
import logging
import uuid

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.audit import AuditLog
from app.models.user import User
from app.models.workspace import Membership, RoleEnum, Workspace

logger = logging.getLogger("seed_admin_data")

DEMO_WORKSPACE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

SAMPLE_USERS = [
    {
        "user_id": "dev-analyst-01",
        "email": "sarah.connor@kenyawildlife.org",
        "full_name": "Dr. Sarah Connor",
        "role": RoleEnum.ADMIN.value,
        "is_active": True,
    },
    {
        "user_id": "admin-01",
        "email": "ops.admin@wildlife-watch.org",
        "full_name": "Operations Command Administrator",
        "role": RoleEnum.ADMIN.value,
        "is_active": True,
    },
    {
        "user_id": "ranger-marcus",
        "email": "marcus.vance@rangers.org",
        "full_name": "Marcus Vance",
        "role": RoleEnum.ANALYST.value,
        "is_active": True,
    },
    {
        "user_id": "reviewer-elena",
        "email": "elena.rostova@iucn.org",
        "full_name": "Elena Rostova",
        "role": RoleEnum.VIEWER.value,
        "is_active": True,
    },
    {
        "user_id": "tech-david",
        "email": "david.kim@conservation-gis.net",
        "full_name": "David Kim",
        "role": RoleEnum.VIEWER.value,
        "is_active": True,
    },
]

SAMPLE_AUDIT_LOGS = [
    {
        "actor": "dev-analyst-01",
        "action": "UPDATE_WORKSPACE_SETTINGS",
        "target_type": "Workspace",
        "target_id": str(DEMO_WORKSPACE_ID),
        "payload": {
            "parameter": "priority_weights",
            "values": {"magnitude": 0.50, "sensitivity": 0.30, "context": 0.20},
            "rationale": "Calibrated per IUCN corridor threat sensitivity guidelines.",
        },
        "hours_ago": 1,
    },
    {
        "actor": "admin-01",
        "action": "UPDATE_MEMBER_ROLE",
        "target_type": "Membership",
        "target_id": "ranger-marcus",
        "payload": {
            "assigned_role": "ANALYST",
            "previous_role": "VIEWER",
            "reason": "Authorized for field verification dispatch.",
        },
        "hours_ago": 4,
    },
    {
        "actor": "dev-analyst-01",
        "action": "VERIFY_EVENT",
        "target_type": "ChangeEvent",
        "target_id": "pench-evt-corridor-01",
        "payload": {
            "status": "VERIFIEDCHANGE",
            "notes": "Drone reconnaissance confirmed commercial teak felling near boundary.",
        },
        "hours_ago": 7,
    },
    {
        "actor": "admin-01",
        "action": "CALIBRATE_SEARCH_BUFFER",
        "target_type": "ContextEnrichment",
        "target_id": "infrastructure_radius",
        "payload": {"buffer_km": 5.0, "source": "OpenStreetMap High-Resolution Tracks"},
        "hours_ago": 18,
    },
    {
        "actor": "dev-analyst-01",
        "action": "SYNC_TELEMETRY_PIPELINE",
        "target_type": "Sentinel2_MSI",
        "target_id": "dry_season_batch_2025",
        "payload": {"cloud_tolerance_percent": 20, "harmonized_indices": ["NDVI", "NDWI", "NDBI"]},
        "hours_ago": 26,
    },
]


async def seed_admin_data():
    async with async_session_factory() as session:
        # Ensure workspace exists
        res = await session.execute(select(Workspace).where(Workspace.id == DEMO_WORKSPACE_ID))
        ws = res.scalar_one_or_none()
        if not ws:
            ws = Workspace(
                id=DEMO_WORKSPACE_ID,
                name="Wildlife Watch Operational Reserve",
                settings={
                    "priority_weights": {"magnitude": 0.50, "sensitivity": 0.30, "context": 0.20},
                    "context_buffer_km": 5.0,
                    "max_cloud_cover_percent": 20,
                    "ndvi_loss_threshold": -0.25,
                },
            )
            session.add(ws)
            await session.commit()
            logger.info("Created demo workspace.")

        # Seed Users & Memberships
        for u in SAMPLE_USERS:
            # Check User
            user_res = await session.execute(select(User).where(User.email == u["email"]))
            existing_user = user_res.scalar_one_or_none()
            if not existing_user:
                new_user = User(
                    id=uuid.uuid4(),
                    email=u["email"],
                    password_hash="dev-insecure-hash-for-testing",
                    full_name=u["full_name"],
                    is_active=u["is_active"],
                    last_login_at=datetime.datetime.now(datetime.timezone.utc),
                )
                session.add(new_user)
                await session.flush()

            # Check Membership
            mem_res = await session.execute(
                select(Membership).where(
                    Membership.workspace_id == DEMO_WORKSPACE_ID,
                    Membership.user_id == u["user_id"],
                )
            )
            existing_mem = mem_res.scalar_one_or_none()
            if not existing_mem:
                new_mem = Membership(
                    id=uuid.uuid4(),
                    workspace_id=DEMO_WORKSPACE_ID,
                    user_id=u["user_id"],
                    role=u["role"],
                )
                session.add(new_mem)

        # Seed Audit Logs
        for a in SAMPLE_AUDIT_LOGS:
            ts = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=a["hours_ago"])
            audit = AuditLog(
                id=uuid.uuid4(),
                workspace_id=DEMO_WORKSPACE_ID,
                actor_id=a["actor"],
                action=a["action"],
                target_type=a["target_type"],
                target_id=a["target_id"],
                payload=a["payload"],
                timestamp=ts,
            )
            session.add(audit)

        await session.commit()
        logger.info("Successfully seeded Admin workspace users, memberships, and audit logs.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    asyncio.run(seed_admin_data())
