from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "docs" / "quality" / "traceability" / "traceability.json"
SCHEMA_PATH = ROOT / "docs" / "quality" / "traceability" / "traceability.schema.json"
DOCUMENT_PATH = ROOT / "docs" / "quality" / "DATA-FLOW-TRACEABILITY.md"


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _ids(records: list[dict[str, object]]) -> set[str]:
    values = [str(record["id"]) for record in records]
    assert len(values) == len(set(values)), f"duplicate IDs found: {values}"
    return set(values)


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


def test_verified_statuses_have_evidence_and_planned_requirements_are_not_done() -> (
    None
):
    catalog = _load_json(CATALOG_PATH)

    for control in catalog["controls"]:
        if control["implementation_status"] != "design_only":
            assert control["evidence_refs"]

    for test in catalog["tests"]:
        if test["verification_status"] != "planned":
            assert test["evidence_refs"]

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
