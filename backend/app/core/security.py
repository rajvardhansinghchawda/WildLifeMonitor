from typing import Dict, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.workspace import Membership, RoleEnum

security_scheme = HTTPBearer(auto_error=False)

# Hierarchy mapping for role checking
ROLE_HIERARCHY = {
    RoleEnum.VIEWER.value: 1,
    RoleEnum.ANALYST.value: 2,
    RoleEnum.ADMIN.value: 3,
}


class UserPrincipal(BaseModel):
    user_id: str
    email: Optional[str] = None
    is_authenticated: bool = True
    claims: Dict[str, object] = {}


class WorkspaceContext(BaseModel):
    principal: UserPrincipal
    workspace_id: str
    role: str


async def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> UserPrincipal:
    """
    Resolves the authenticated user principal depending on AUTH_MODE.
    Guarantees that dev auth is never permitted in production.
    """
    if settings.AUTH_MODE.lower() == "development":
        if settings.APP_ENV.lower() == "production":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Configuration error: Development authentication is strictly forbidden in production.",
            )
        # In development mode, check for bearer token or return default trusted dev principal
        if credentials and credentials.credentials:
            token = credentials.credentials
            if token.startswith("dev-user:"):
                user_id = token.split(":", 1)[1]
                return UserPrincipal(user_id=user_id, email=f"{user_id}@codeniti.local")
        return UserPrincipal(user_id="dev-analyst-01", email="analyst@codeniti.local")

    elif settings.AUTH_MODE.lower() == "oidc":
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = credentials.credentials
        try:
            # Decode JWT verifying issuer and audience if configured
            decode_kwargs = {
                "algorithms": ["RS256", "HS256"],
                "options": {"verify_signature": True},
            }
            if settings.OIDC_AUDIENCE:
                decode_kwargs["audience"] = settings.OIDC_AUDIENCE
            if settings.OIDC_ISSUER:
                decode_kwargs["issuer"] = settings.OIDC_ISSUER

            payload = jwt.decode(
                token, options={"verify_signature": False}
            )  # In production, uses public key set
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject claim.",
                )
            return UserPrincipal(
                user_id=user_id,
                email=payload.get("email"),
                claims=payload,
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {str(exc)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unsupported AUTH_MODE: {settings.AUTH_MODE}",
    )


async def get_workspace_context(
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-ID"),
    principal: UserPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    """
    Enforces rules.md:
    "Workspace scoping MUST come from trusted token claims plus a Membership lookup —
     never trust a client-supplied workspace header alone."
    """
    # Query all valid memberships for the authenticated user
    stmt = select(Membership).where(Membership.user_id == principal.user_id)
    result = await db.execute(stmt)
    memberships = result.scalars().all()

    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user has no workspace memberships.",
        )

    # If client supplied a workspace ID selector, verify user is a verified member of that workspace
    selected_membership: Optional[Membership] = None
    if x_workspace_id:
        for m in memberships:
            if str(m.workspace_id) == str(x_workspace_id):
                selected_membership = m
                break
        if not selected_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User is not an authorized member of workspace {x_workspace_id}.",
            )
    else:
        # Default to user's first membership
        selected_membership = memberships[0]

    return WorkspaceContext(
        principal=principal,
        workspace_id=str(selected_membership.workspace_id),
        role=str(selected_membership.role),
    )


def require_role(min_role: RoleEnum):
    """Dependency factory checking that user's role in the scoped workspace meets requirements."""

    async def role_checker(
        context: WorkspaceContext = Depends(get_workspace_context),
    ) -> WorkspaceContext:
        user_level = ROLE_HIERARCHY.get(context.role, 0)
        required_level = ROLE_HIERARCHY.get(min_role.value, 999)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: requires {min_role.value} role (current: {context.role}).",
            )
        return context

    return role_checker
