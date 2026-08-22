from pathlib import Path

from scripts.canary_scan import scan_paths
from tests.security.canaries import canary_by_id


def test_scanner_accepts_clean_artifact(tmp_path: Path) -> None:
    artifact = tmp_path / "clean.json"
    artifact.write_text('{"result":"synthetic and clean"}', encoding="utf-8")

    assert scan_paths([tmp_path]) == []


def test_scanner_detects_plain_and_encoded_canaries(tmp_path: Path) -> None:
    canary = canary_by_id("secret.api_key")
    plain, encoded, _json_escaped = canary.scan_variants()
    (tmp_path / "plain.log").write_text(plain, encoding="utf-8")
    (tmp_path / "encoded.json").write_text(encoded, encoding="utf-8")

    findings = scan_paths([tmp_path])

    assert {(item.path.name, item.canary_id) for item in findings} == {
        ("encoded.json", canary.id),
        ("plain.log", canary.id),
    }


def test_repository_contains_no_generated_canary_values() -> None:
    root = Path(__file__).resolve().parents[2]
    assert scan_paths([root]) == []
