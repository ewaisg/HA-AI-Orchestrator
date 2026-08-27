"""Constants for AI Orchestrator."""

from typing import Final

DOMAIN: Final = "ai_orchestrator"
NAME: Final = "AI Orchestrator"

FOUNDATION_ENTRY_UNIQUE_ID: Final = "ai_orchestrator_foundation"

STATUS_WEBSOCKET_TYPE: Final = f"{DOMAIN}/status"
STATUS_SCHEMA_VERSION: Final = 1
STATUS_PHASE: Final = "foundation"

WORKFLOW_PROBE_EVENT: Final = "ai_orchestrator_foundation_workflow_probe"
WORKFLOW_PROBE_ID: Final = "foundation_lifecycle_probe"
WORKFLOW_PROBE_SCHEMA_VERSION: Final = 1
WORKFLOW_PROBE_TRIGGER_TYPE: Final = "integration_event"
WORKFLOW_PROBE_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflow/probe/run"

PROVIDER_LIST_WEBSOCKET_TYPE: Final = f"{DOMAIN}/providers/list"
PROVIDER_TEST_WEBSOCKET_TYPE: Final = f"{DOMAIN}/providers/test"
CATALOG_WEBSOCKET_TYPE: Final = f"{DOMAIN}/catalog"
CATALOG_SCHEMA_VERSION: Final = 1

PANEL_ELEMENT_NAME: Final = "ai-orchestrator-panel"
PANEL_FILENAME: Final = "ai-orchestrator-panel.js"
PANEL_URL_PATH: Final = "ai-orchestrator"
PANEL_STATIC_URL: Final = f"/api/{DOMAIN}/static"
PANEL_MODULE_URL: Final = f"{PANEL_STATIC_URL}/{PANEL_FILENAME}"
PANEL_SIDEBAR_ICON: Final = "mdi:robot-outline"
