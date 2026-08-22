"""Scan committed-style text artifacts for generated synthetic canaries."""

import sys
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT))

from tests.security.canaries import CANARIES  # noqa: E402

IGNORED_PARTS = frozenset(
    {
        ".git",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".venv",
        "__pycache__",
        "node_modules",
        "outputs",
        "work",
    }
)
IGNORED_FILES = frozenset({Path("tests/security/canaries.py")})


@dataclass(frozen=True, slots=True)
class Finding:
    """One detected canary occurrence."""

    path: Path
    canary_id: str
    variant_index: int


def _is_ignored(path: Path, root: Path) -> bool:
    try:
        relative = path.relative_to(root)
    except ValueError:
        relative = path
    return (
        any(part in IGNORED_PARTS for part in relative.parts)
        or relative in IGNORED_FILES
    )


def _candidate_files(paths: Iterable[Path]) -> Iterable[tuple[Path, Path]]:
    for supplied in paths:
        path = supplied.resolve()
        if path.is_file():
            yield path, path.parent
            continue
        for candidate in path.rglob("*"):
            if candidate.is_file() and not _is_ignored(candidate, path):
                yield candidate, path


def scan_paths(paths: Iterable[Path]) -> list[Finding]:
    """Return every generated canary found in readable text artifacts."""
    findings: list[Finding] = []
    for path, _root in _candidate_files(paths):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError, UnicodeDecodeError:
            continue
        for canary in CANARIES:
            for index, variant in enumerate(canary.scan_variants()):
                if variant in text:
                    findings.append(Finding(path, canary.id, index))
    return findings


def main() -> int:
    """Scan the repository and print only actionable canary findings."""
    findings = scan_paths([REPOSITORY_ROOT])
    for finding in findings:
        relative = finding.path.relative_to(REPOSITORY_ROOT)
        print(f"{relative}:{finding.canary_id}:variant-{finding.variant_index}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
