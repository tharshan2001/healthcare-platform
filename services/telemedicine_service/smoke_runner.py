"""Tiny smoke runner for provider payload generation.

Run from service folder:
    python smoke_runner.py
"""

from uuid import uuid4

from app.models.session import ParticipantRole
from app.video_provider import get_video_provider


def main() -> None:
    provider = get_video_provider("jitsi")
    join_url, token, expiry = provider.build_join_payload(
        session_id=uuid4(),
        room_name="healthcare-demo-room",
        role=ParticipantRole.DOCTOR,
        participant_id=uuid4(),
        display_name="Dr Demo",
    )

    print("Provider smoke test passed")
    print(f"join_url={join_url}")
    print(f"token_length={len(token)}")
    print(f"expires_at={expiry.isoformat()}")


if __name__ == "__main__":
    main()

