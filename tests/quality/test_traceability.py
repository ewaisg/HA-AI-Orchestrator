from __future__ import annotations

import json
import re
from hashlib import sha256
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "docs" / "quality" / "traceability" / "traceability.json"
SCHEMA_PATH = ROOT / "docs" / "quality" / "traceability" / "traceability.schema.json"
DOCUMENT_PATH = ROOT / "docs" / "quality" / "DATA-FLOW-TRACEABILITY.md"
MANIFEST_PATH = (
    ROOT
    / "docs"
    / "evidence"
    / "manifests"
    / "FND-013"
    / "FND-013-DATA-FLOW-TRACEABILITY-001.json"
)


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _ids(records: list[dict[str, object]]) -> set[str]:
    values = [str(record["id"]) for record in records]
    assert len(values) == len(set(values)), f"duplicate IDs found: {values}"
    return set(values)


def _readable_requirement_mappings() -> dict[str, dict[str, list[str]]]:
    document = DOCUMENT_PATH.read_text(encoding="utf-8")
    requirement_section = document.split("## Requirement traceability", 1)[1].split(
        "## Test registry", 1
    )[0]
    mappings: dict[str, dict[str, list[str]]] = {}

    for line in requirement_section.splitlines():
        if not line.startswith("| REQ-"):
            continue

        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        assert len(cells) == 5, f"unexpected requirement row: {line}"
        requirement_id = cells[0]
        assert requirement_id not in mappings, (
            f"duplicate readable row: {requirement_id}"
        )
        mappings[requirement_id] = {
            "flow_ids": re.findall(r"\bFLOW-[0-9]{3}\b", cells[2]),
            "control_ids": re.findall(r"\bCTRL-[A-Z0-9-]+\b", cells[3]),
            "test_ids": re.findall(r"\bTEST-[A-Z0-9-]+\b", cells[4]),
        }

    return mappings


def test_traceability_catalog_matches_schema() -> None:
    schema = _load_json(SCHEMA_PATH)
    catalog = _load_json(CATALOG_PATH)

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(catalog), key=lambda error: list(error.path))

    assert errors == [], "\n".join(error.message for error in errors)


def test_traceability_references_resolve_and_requirements_are_covered() -> None:
    catalog = _load_json(CATALOG_PATH)
    data_class_ids = _ids(catalog["data_classes"])
    node_ids = _ids(catalog["nodes"])
    flow_ids = _ids(catalog["flows"])
    requirement_ids = _ids(catalog["requirements"])
    control_ids = _ids(catalog["controls"])
    test_ids = _ids(catalog["tests"])

    all_ids = (
        data_class_ids | node_ids | flow_ids | requirement_ids | control_ids | test_ids
    )
    expected_count = sum(
        len(catalog[key])
        for key in (
            "data_classes",
            "nodes",
            "flows",
            "requirements",
            "controls",
            "tests",
        )
    )
    assert len(all_ids) == expected_count, "IDs must be unique across the whole catalog"

    for flow in catalog["flows"]:
        assert flow["from_node"] in node_ids
        assert flow["to_node"] in node_ids
        assert set(flow["data_class_ids"]) <= data_class_ids
        assert set(flow["control_ids"]) <= control_ids
        assert set(flow["test_ids"]) <= test_ids

    for requirement in catalog["requirements"]:
        assert set(requirement["flow_ids"]) <= flow_ids
        assert set(requirement["control_ids"]) <= control_ids
        assert set(requirement["test_ids"]) <= test_ids

    used_node_ids = {
        node_id
        for flow in catalog["flows"]
        for node_id in (flow["from_node"], flow["to_node"])
    }
    used_data_class_ids = {
        data_class_id
        for flow in catalog["flows"]
        for data_class_id in flow["data_class_ids"]
    }
    used_control_ids = {
        control_id
        for records in (catalog["flows"], catalog["requirements"])
        for record in records
        for control_id in record["control_ids"]
    }
    used_test_ids = {
        test_id
        for records in (catalog["flows"], catalog["requirements"])
        for record in records
        for test_id in record["test_ids"]
    }

    assert used_node_ids == node_ids
    assert used_data_class_ids == data_class_ids
    assert used_control_ids == control_ids
    assert used_test_ids | {"TEST-CATALOG-INTEGRITY"} == test_ids


def test_verified_statuses_have_evidence_and_planned_requirements_are_not_done() -> (
    None
):
    catalog = _load_json(CATALOG_PATH)

    for control in catalog["controls"]:
        if control["implementation_status"] != "design_only":
            assert control["evidence_refs"]
        for evidence_ref in control["evidence_refs"]:
            assert (ROOT / evidence_ref).is_file()

    for test in catalog["tests"]:
        if test["verification_status"] != "planned":
            assert test["evidence_refs"]
        for evidence_ref in test["evidence_refs"]:
            assert (ROOT / evidence_ref).is_file()

    assert all(
        requirement["delivery_status"] != "delivered"
        for requirement in catalog["requirements"]
    ), "FND-013 defines traceability; it does not deliver product requirements"


def test_every_catalog_id_is_present_in_the_readable_map() -> None:
    catalog = _load_json(CATALOG_PATH)
    document = DOCUMENT_PATH.read_text(encoding="utf-8")

    for key in ("data_classes", "nodes", "flows", "requirements", "controls", "tests"):
        for record in catalog[key]:
            assert record["id"] in document, (
                f"{record['id']} is missing from the readable map"
            )


def test_readable_requirement_rows_match_catalog_mappings() -> None:
    catalog = _load_json(CATALOG_PATH)
    expected = {
        requirement["id"]: {
            "flow_ids": requirement["flow_ids"],
            "control_ids": requirement["control_ids"],
            "test_ids": requirement["test_ids"],
        }
        for requirement in catalog["requirements"]
    }

    assert _readable_requirement_mappings() == expected


def test_sensitive_directional_boundaries_are_explicit() -> None:
    catalog = _load_json(CATALOG_PATH)
    flows = {flow["id"]: flow for flow in catalog["flows"]}

    for flow_id in ("FLOW-001", "FLOW-003", "FLOW-006", "FLOW-007"):
        assert "DATA-CREDENTIAL" in flows[flow_id]["data_class_ids"]

    for flow_id in ("FLOW-004", "FLOW-008", "FLOW-009"):
        assert "CTRL-INPUT-TRUST-001" in flows[flow_id]["control_ids"]
        assert "TEST-PROMPT-INJECTION" in flows[flow_id]["test_ids"]

    for flow_id in ("FLOW-006", "FLOW-007", "FLOW-012"):
        assert "CTRL-RATE-001" in flows[flow_id]["control_ids"]
        assert "TEST-STORM-CONCURRENCY" in flows[flow_id]["test_ids"]

    assert "CTRL-IDEMPOTENCY-001" in flows["FLOW-012"]["control_ids"]
    assert "TEST-IDEMPOTENT-RESTART" in flows["FLOW-012"]["test_ids"]

    restore_flows = [
        flow for flow in catalog["flows"] if "TEST-BACKUP-RESTORE" in flow["test_ids"]
    ]
    assert restore_flows
    assert all(flow["from_node"].startswith("NODE-BACKUP-") for flow in restore_flows)
    assert all(flow["to_node"] == "NODE-RESTORE-HA" for flow in restore_flows)
    assert all(flow["from_node"] != "NODE-HA" for flow in restore_flows)

    device_flows = [
        flow for flow in catalog["flows"] if flow["to_node"] == "NODE-DEVICE"
    ]
    assert len(device_flows) == 1
    assert "TEST-DEVICE-SIDE-EFFECT" in device_flows[0]["test_ids"]


def test_fnd013_manifest_artifact_hashes_match_repository_files() -> None:
    manifest = _load_json(MANIFEST_PATH)

    for artifact in manifest["artifacts"]:
        artifact_path = ROOT / artifact["repository_path"]
        assert artifact_path.is_file()
        assert sha256(artifact_path.read_bytes()).hexdigest() == artifact["sha256"]
