"""Run repository tests that do not import Home Assistant's Linux-only test stack."""

from __future__ import annotations

import os
import subprocess
import sys


def main() -> int:
    """Execute the isolated pure-Python test suites and return their exit code."""
    environment = os.environ.copy()
    environment["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"
    command = [
        sys.executable,
        "-m",
        "pytest",
        "-p",
        "pytest_asyncio.plugin",
        "tests/security",
        "tests/quality",
        "tests/providers",
        "-q",
    ]
    return subprocess.call(command, env=environment)  # noqa: S603


if __name__ == "__main__":
    raise SystemExit(main())
