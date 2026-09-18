from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="8–72 bytes (bcrypt limit)")
    full_name: str = Field(..., min_length=2, max_length=255)
    workspace_name: Optional[str] = Field(default=None, max_length=255)

    @field_validator("password")
    @classmethod
    def password_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return value


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return value


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)


class MembershipInfo(BaseModel):
    workspace_id: str
    workspace_name: str
    role: str
    is_public: bool = False


class UserInfo(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None
    memberships: List[MembershipInfo] = Field(default_factory=list)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access-token lifetime in seconds")
    user: Optional[UserInfo] = None
