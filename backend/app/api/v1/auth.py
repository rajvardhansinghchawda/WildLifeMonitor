from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserInfo,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


def _require_local_mode() -> None:
    if settings.AUTH_MODE.lower() != "local":
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="AUTHMODEUNSUPPORTED",
            message="Account endpoints require AUTH_MODE=local.",
        )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create an account, a personal workspace (admin membership) and return OAuth2 tokens."""
    _require_local_mode()
    return await auth_service.register_user(
        db,
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        workspace_name=request.workspace_name,
    )


@router.post("/token", response_model=TokenResponse)
async def token(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 password flow: `username` is the account email."""
    _require_local_mode()
    return await auth_service.authenticate(db, email=form.username, password=form.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Rotate the refresh token and issue a new access token."""
    _require_local_mode()
    return await auth_service.refresh_session(db, request.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    _require_local_mode()
    await auth_service.revoke_refresh_token(db, request.refresh_token)


@router.get("/me", response_model=UserInfo)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await auth_service.build_user_info(db, user)


@router.patch("/me", response_model=UserInfo)
async def update_me(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.full_name = request.full_name.strip()
    await db.commit()
    return await auth_service.build_user_info(db, user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(db, user, request.current_password, request.new_password)
