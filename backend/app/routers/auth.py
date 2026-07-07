from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import random
import redis.asyncio as aioredis
from app.core.database import get_db, AsyncSessionLocal
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.models.models import User
from app.schemas.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserOut,
    VerifyMobileRequest,
    VerifyMobileResponse,
    SendMobileOtpRequest,
    SendMobileOtpResponse,
    VerifyMobileOtpRequest,
    VerifyMobileOtpResponse,
    SendEmailOtpRequest,
    VerifyEmailOtpRequest,
)
from app.schemas.schemas import ResetPasswordRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Redis client for OTP storage (lazy-init)
redis_client: aioredis.Redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
EMAIL_OTP_TTL = 600  # 10 minutes

MSG91_VERIFY_ACCESS_TOKEN_URL = "https://control.msg91.com/api/v5/widget/verifyAccessToken"
MSG91_SEND_OTP_URL = "https://control.msg91.com/api/v5/otp"
MSG91_VERIFY_OTP_URL = "https://control.msg91.com/api/v5/otp/verify"


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())[-10:]


def _extract_mobile(data: object) -> str:
    """Extract mobile from variable MSG91 response payload shapes."""
    if isinstance(data, dict):
        for key in ("mobile", "mobile_number", "phone", "identifier", "number"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                normalized = _normalize_phone(value)
                if normalized:
                    return normalized
        for value in data.values():
            extracted = _extract_mobile(value)
            if extracted:
                return extracted

    if isinstance(data, list):
        for value in data:
            extracted = _extract_mobile(value)
            if extracted:
                return extracted

    return ""


def _ensure_msg91_otp_config() -> None:
    if not settings.MSG91_AUTH_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MSG91 auth key is missing on server.",
        )
    if settings.MSG91_DLT_REQUIRED and not settings.MSG91_TEMPLATE_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DLT-approved MSG91 template is required. Set MSG91_TEMPLATE_ID in backend environment.",
        )


async def _verify_msg91_access_token(access_token: str) -> dict:
    if not settings.MSG91_AUTH_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MSG91 is not configured on server.",
        )

    headers = {
        "authkey": settings.MSG91_AUTH_KEY,
        "Content-Type": "application/json",
    }

    payload_attempts = [
        {"access-token": access_token},
        {"accessToken": access_token},
        {"token": access_token},
    ]

    async with httpx.AsyncClient(timeout=12.0) as client:
        last_status = None
        last_body = ""
        for payload in payload_attempts:
            resp = await client.post(MSG91_VERIFY_ACCESS_TOKEN_URL, json=payload, headers=headers)
            last_status = resp.status_code
            last_body = resp.text
            if resp.status_code == status.HTTP_200_OK:
                try:
                    return resp.json()
                except Exception as exc:  # pragma: no cover
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Invalid MSG91 verification response.",
                    ) from exc

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"MSG91 verification failed ({last_status}): {last_body[:180]}",
    )


@router.post("/verify-mobile", response_model=VerifyMobileResponse)
async def verify_mobile(payload: VerifyMobileRequest):
    token = payload.access_token.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="access_token is required")

    # ── Dev bypass: skip MSG91 when running locally ────────────────────────────
    # Only allowed when ENVIRONMENT=development. Must be 'production' in prod.
    if token == "__dev_bypass__":
        if settings.ENVIRONMENT.lower() not in ("development", "dev"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dev bypass is not allowed in production.",
            )
        if not payload.mobile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="mobile is required for dev bypass")
        verified_mobile = _normalize_phone(payload.mobile)
        if len(verified_mobile) != 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mobile number")
        # Skip DB check in dev — always allow registration to proceed.
        return VerifyMobileResponse(exists=False, mobile=verified_mobile, message="Mobile verified (dev bypass).")

    msg91_data = await _verify_msg91_access_token(token)

    verified_mobile = _extract_mobile(msg91_data)
    if payload.mobile:
        input_mobile = _normalize_phone(payload.mobile)
        if len(input_mobile) != 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mobile number format")
        if verified_mobile and verified_mobile != input_mobile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verified mobile mismatch")
        verified_mobile = input_mobile

    if len(verified_mobile) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not resolve verified mobile number from MSG91 response.",
        )

    # DB check only runs for real MSG91 tokens (not dev bypass path above).
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.phone == verified_mobile))
        existing = result.scalar_one_or_none()
        if existing:
            return VerifyMobileResponse(
                exists=True,
                mobile=verified_mobile,
                message="Account already exists. Please sign in using Email & Password.",
            )

    return VerifyMobileResponse(
        exists=False,
        mobile=verified_mobile,
        message="Mobile verified successfully.",
    )


# ── Direct MSG91 OTP (no widget) ──────────────────────────────────────────────

@router.post("/send-mobile-otp", response_model=SendMobileOtpResponse)
async def send_mobile_otp(payload: SendMobileOtpRequest):
    """Send a 6-digit OTP to the given mobile via MSG91 direct API."""
    mobile = _normalize_phone(payload.mobile)
    if len(mobile) != 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mobile number.")
    _ensure_msg91_otp_config()

    params = {
        "authkey": settings.MSG91_AUTH_KEY,
        "mobile": f"91{mobile}",
        "otp_length": 6,
        "otp_expiry": 10,
    }
    # DLT-compliant template id.
    if settings.MSG91_TEMPLATE_ID:
        params["template_id"] = settings.MSG91_TEMPLATE_ID

    async with httpx.AsyncClient(timeout=12.0, verify=settings.MSG91_VERIFY_SSL) as client:
        try:
            resp = await client.get(MSG91_SEND_OTP_URL, params=params)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not reach MSG91: {exc}",
            ) from exc
        body = resp.text
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"MSG91 send OTP failed: {body[:200]}",
            )
        try:
            data = resp.json()
            if data.get("type") not in ("success", None) and "error" in str(data).lower():
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"MSG91 error: {body[:200]}",
                )
        except ValueError:
            pass  # some MSG91 responses are not JSON

    return SendMobileOtpResponse(message="OTP sent successfully.")


@router.post("/verify-mobile-otp", response_model=VerifyMobileOtpResponse)
async def verify_mobile_otp(payload: VerifyMobileOtpRequest):
    """Verify a 6-digit OTP for the given mobile via MSG91 direct API."""
    mobile = _normalize_phone(payload.mobile)
    otp = payload.otp.strip()
    if len(mobile) != 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mobile number.")
    if not otp.isdigit() or len(otp) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP format.")
    if not settings.MSG91_AUTH_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="MSG91 auth key is missing on server.")

    params = {
        "authkey": settings.MSG91_AUTH_KEY,
        "mobile": f"91{mobile}",
        "otp": otp,
    }
    async with httpx.AsyncClient(timeout=12.0, verify=settings.MSG91_VERIFY_SSL) as client:
        try:
            resp = await client.get(MSG91_VERIFY_OTP_URL, params=params)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not reach MSG91: {exc}",
            ) from exc
        body = resp.text
        import logging as _log
        _log.getLogger("uvicorn.error").info(
            f"[MSG91 verify] mobile=91{mobile} otp_len={len(otp)} status={resp.status_code} body={body[:300]}"
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"MSG91 verify returned {resp.status_code}: {body[:200]}",
            )
        try:
            data = resp.json()
            msg_type = data.get("type", "")
            if msg_type != "success":
                raw_msg = data.get("message", "")
                friendly = {
                    "OTP not match": "Incorrect OTP. Please check the SMS and try again.",
                    "OTP already verified": "This OTP was already used. Please request a new one.",
                    "OTP expired": "OTP has expired. Please click 'Resend OTP'.",
                    "mobile no. is invalid": "Invalid mobile number.",
                }.get(raw_msg, raw_msg or f"OTP verification failed.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=friendly,
                )
        except ValueError:
            if "success" not in body.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OTP verification failed.",
                )

    # Check if user already exists in DB (best-effort — non-fatal if DB unavailable).
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.phone == mobile))
            existing = result.scalar_one_or_none()
            if existing:
                return VerifyMobileOtpResponse(
                    exists=True, mobile=mobile,
                    message="Account already exists. Please sign in.",
                )
    except Exception:
        pass  # DB unavailable — let registration proceed; duplicate check happens at /register

    return VerifyMobileOtpResponse(exists=False, mobile=mobile, message="Mobile verified successfully.")


# ── Resend Email OTP ──────────────────────────────────────────────────────────

@router.post("/send-email-otp")
async def send_email_otp(payload: SendEmailOtpRequest):
    """Generate a 6-digit OTP, store in Redis, send via Resend."""
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Email service is not configured (RESEND_API_KEY missing).")

    otp = str(random.randint(100000, 999999))
    redis_key = f"email_otp:{email}"
    await redis_client.setex(redis_key, EMAIL_OTP_TTL, otp)

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=settings.RESEND_VERIFY_SSL) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [email],
                    "subject": "Your ThreadX verification code",
                    "html": f"<p>Your ThreadX verification code is: <strong>{otp}</strong></p><p>This code expires in 10 minutes.</p>",
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to connect to email provider. Please try again.",
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to send email: {resp.text[:200]}")

    return {"message": "OTP sent to email."}


@router.post("/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOtpRequest):
    """Verify email OTP stored in Redis."""
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
    if not otp.isdigit() or len(otp) != 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP must be a 6-digit number.")

    redis_key = f"email_otp:{email}"
    stored = await redis_client.get(redis_key)
    if stored is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired or not found. Please request a new one.")
    if stored.decode() != otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP. Please try again.")

    await redis_client.delete(redis_key)
    return {"verified": True, "message": "Email verified successfully."}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role.value})
    return TokenResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended."
        )

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role.value})
    return TokenResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout():
    # In production: add token to Redis blocklist
    return {"message": "Logged out successfully"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended.",
        )

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password updated successfully."}
