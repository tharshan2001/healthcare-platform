import secrets
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import UUID

from config import settings
from models.session import ParticipantRole


class VideoProvider(ABC):
    @abstractmethod
    def build_join_payload(
        self,
        session_id: UUID,
        room_name: str,
        role: ParticipantRole,
        participant_id: UUID,
        display_name: str,
    ) -> tuple[str, str, datetime]:
        """Return join_url, access_token, token_expiry_utc."""


class JitsiProvider(VideoProvider):
    def build_join_payload(
        self,
        session_id: UUID,
        room_name: str,
        role: ParticipantRole,
        participant_id: UUID,
        display_name: str,
    ) -> tuple[str, str, datetime]:
        expiry = datetime.now(timezone.utc) + timedelta(seconds=settings.JOIN_TOKEN_TTL_SECONDS)
        access_token = secrets.token_urlsafe(32)
        safe_name = quote(display_name)
        join_url = (
            f"{settings.JITSI_BASE_URL.rstrip('/')}/{room_name}"
            f"#userInfo.displayName=\"{safe_name}\"&config.startWithAudioMuted=false"
        )
        return join_url, access_token, expiry


class TwilioProvider(VideoProvider):
    def build_join_payload(
        self,
        session_id: UUID,
        room_name: str,
        role: ParticipantRole,
        participant_id: UUID,
        display_name: str,
    ) -> tuple[str, str, datetime]:
        required = [settings.TWILIO_ACCOUNT_SID, settings.TWILIO_API_KEY, settings.TWILIO_API_SECRET]
        if not all(required):
            raise ValueError("Twilio provider is selected but Twilio credentials are not configured")

        try:
            from twilio.jwt.access_token import AccessToken
            from twilio.jwt.access_token.grants import VideoGrant
        except ImportError as exc:
            raise ValueError("Twilio SDK is not installed. Add twilio dependency.") from exc

        identity = f"{role.value}-{participant_id}"
        ttl = settings.JOIN_TOKEN_TTL_SECONDS
        access = AccessToken(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_API_KEY,
            settings.TWILIO_API_SECRET,
            identity=identity,
            ttl=ttl,
        )
        access.add_grant(VideoGrant(room=room_name))
        token = access.to_jwt().decode("utf-8")
        expiry = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        join_url = f"twilio://video/{room_name}"
        return join_url, token, expiry


def get_video_provider(provider_name: str | None = None) -> VideoProvider:
    provider = (provider_name or settings.VIDEO_PROVIDER).strip().lower()
    if provider == "twilio":
        return TwilioProvider()
    return JitsiProvider()


