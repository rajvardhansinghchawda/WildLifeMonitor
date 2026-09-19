import asyncio
import uuid
import bcrypt
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import async_session_factory
from app.models.user import User
from app.models.workspace import Workspace, Membership, RoleEnum
from app.services.auth_service import authenticate

DEMO_WS_ID = uuid.UUID('00000000-0000-0000-0000-000000000001')

ACCOUNTS = [
    {
        "email": "admin@wildlife.gov",
        "full_name": "System Administrator",
        "role": RoleEnum.ADMIN.value,
        "panel": "Admin Console & System Operations (/admin, /admin/members, /admin/settings)",
    },
    {
        "email": "analyst@wildlife.gov",
        "full_name": "Senior GIS Analyst",
        "role": RoleEnum.ANALYST.value,
        "panel": "Change Analysis, Hotspots & GIS Intelligence (/change-analysis, /hotspots)",
    },
    {
        "email": "ranger@wildlife.gov",
        "full_name": "Ranger Lead",
        "role": RoleEnum.ANALYST.value,
        "panel": "Ranger Operations & Incident Alerts (/dashboard, /alerts, /areas)",
    },
    {
        "email": "invest@codeniti.dev",
        "full_name": "Forensic Investigator",
        "role": RoleEnum.ADMIN.value,
        "panel": "Investigation & Forensic Analysis (/compare, /timeline, /reports)",
    },
    {
        "email": "rajesh.sharma@forest.gov.in",
        "full_name": "Senior Director Rajesh Sharma (NTCA)",
        "role": RoleEnum.ADMIN.value,
        "panel": "Executive & Government Oversight (/dashboard, /admin, /reports)",
    },
    {
        "email": "viewer@wildlife.gov",
        "full_name": "Field Observer / Viewer",
        "role": RoleEnum.VIEWER.value,
        "panel": "Read-Only Field Observer / IUCN Reviewer (/dashboard, /explore)",
    },
]

async def seed():
    pwd_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt(12)).decode("utf-8")
    async with async_session_factory() as s:
        # Check workspace
        ws = (await s.execute(select(Workspace).where(Workspace.id == DEMO_WS_ID))).scalar_one_or_none()
        if not ws:
            ws = Workspace(id=DEMO_WS_ID, name="Wildlife Watch Operational Reserve", settings={})
            s.add(ws)
            await s.flush()

        for acc in ACCOUNTS:
            email = acc["email"]
            user = (await s.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    email=email,
                    password_hash=pwd_hash,
                    full_name=acc["full_name"],
                    is_active=True,
                )
                s.add(user)
                await s.flush()
                print(f"Created user: {email}")
            else:
                user.password_hash = pwd_hash
                user.full_name = acc["full_name"]
                user.is_active = True
                print(f"Updated user: {email}")

            # Membership in DEMO workspace
            mem = (await s.execute(select(Membership).where(
                Membership.workspace_id == DEMO_WS_ID,
                Membership.user_id == str(user.id),
            ))).scalar_one_or_none()

            if not mem:
                mem = Membership(
                    id=uuid.uuid4(),
                    workspace_id=DEMO_WS_ID,
                    user_id=str(user.id),
                    role=acc["role"],
                )
                s.add(mem)
                print(f"Added membership for {email} -> {acc['role']}")
            else:
                mem.role = acc["role"]
                print(f"Updated membership for {email} -> {acc['role']}")

        await s.commit()

        print("\n================ VERIFICATION ================")
        for acc in ACCOUNTS:
            token = await authenticate(s, acc["email"], "password123")
            print(f"✓ {acc['email']} ({acc['role']}): LOGIN SUCCESS")

if __name__ == "__main__":
    asyncio.run(seed())
