"""Deterministic, obviously synthetic values used to prove redaction."""

from dataclasses import dataclass
from urllib.parse import quote

REDACTED = "[REDACTED]"


@dataclass(frozen=True, slots=True)
class Canary:
    """One synthetic value that must never escape a protected egress."""

    id: str
    classification: str
    value: str
    expected_replacement: str = REDACTED

    def scan_variants(self) -> tuple[str, ...]:
        """Return encodings an artifact scanner must detect."""

        json_escaped = self.value.replace("\\", "\\\\").replace('"', '\\"')
        return (self.value, quote(self.value, safe=""), json_escaped)


def _synthetic(*parts: str) -> str:
    """Assemble a non-usable canary without storing token-like literals."""

    return "".join(parts)


CANARIES: tuple[Canary, ...] = (
    Canary(
        "secret.api_key", "credential", _synthetic("syn", "thetic-api-key-", "0001")
    ),
    Canary(
        "secret.bearer",
        "credential",
        _synthetic("Bearer ", "synthetic-bearer-", "0002"),
    ),
    Canary(
        "secret.jwt_like", "credential", _synthetic("synthetic.", "jwt-like.", "0003")
    ),
    Canary(
        "secret.aws_access_key_id",
        "credential",
        _synthetic("AKIA", "SYNTHETIC", "00000004"),
    ),
    Canary(
        "secret.aws_secret_access_key",
        "credential",
        _synthetic("synthetic-aws-secret-", "0005"),
    ),
    Canary(
        "secret.aws_session_token",
        "credential",
        _synthetic("synthetic-aws-session-", "0006"),
    ),
    Canary(
        "secret.azure_key", "credential", _synthetic("synthetic-azure-key-", "0007")
    ),
    Canary("secret.password", "credential", _synthetic("synthetic-password-", "0008")),
    Canary(
        "secret.url_userinfo",
        "credential",
        _synthetic("synthetic-user:synthetic-pass", "@example.invalid"),
    ),
    Canary(
        "secret.sensitive_query",
        "credential",
        _synthetic("api_key=synthetic-query-", "0010"),
    ),
    Canary(
        "secret.custom_header", "credential", _synthetic("X-Synthetic-Secret: ", "0011")
    ),
    Canary(
        "privacy.entity_id",
        "household",
        _synthetic("binary_sensor.synthetic_private_", "0012"),
    ),
    Canary(
        "privacy.friendly_name",
        "household",
        _synthetic("Synthetic Private Room ", "0013"),
    ),
    Canary("privacy.person", "personal", _synthetic("Synthetic Person ", "0014")),
    Canary("privacy.location", "location", _synthetic("Synthetic Location ", "0015")),
    Canary(
        "privacy.calendar_text",
        "personal",
        _synthetic("Synthetic Calendar Event ", "0016"),
    ),
    Canary(
        "privacy.voice_text",
        "personal",
        _synthetic("Synthetic Voice Transcript ", "0017"),
    ),
    Canary(
        "privacy.camera_id",
        "household",
        _synthetic("camera.synthetic_private_", "0018"),
    ),
    Canary(
        "privacy.notification_target",
        "household",
        _synthetic("notify.synthetic_private_", "0019"),
    ),
)


def canary_by_id(canary_id: str) -> Canary:
    """Return a canary by stable identifier."""

    try:
        return next(canary for canary in CANARIES if canary.id == canary_id)
    except StopIteration as err:
        raise KeyError(canary_id) from err
