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
CATALOG_LIST_WEBSOCKET_TYPE: Final = f"{DOMAIN}/catalog/list"
CHAT_OPTIONS_WEBSOCKET_TYPE: Final = f"{DOMAIN}/chat/options"
CHAT_SEND_WEBSOCKET_TYPE: Final = f"{DOMAIN}/chat/send"
WORKFLOW_LIST_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/list"
WORKFLOW_SAVE_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/save"
WORKFLOW_DELETE_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/delete"
WORKFLOW_SET_ENABLED_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/set_enabled"
WORKFLOW_RUN_MANUAL_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/run_manual"
WORKFLOW_DRY_RUN_WEBSOCKET_TYPE: Final = f"{DOMAIN}/workflows/dry_run"

PANEL_ELEMENT_NAME: Final = "ai-orchestrator-panel"
PANEL_FILENAME: Final = "ai-orchestrator-panel.js"
PANEL_URL_PATH: Final = "ai-orchestrator"
PANEL_STATIC_URL: Final = f"/api/{DOMAIN}/static"
PANEL_MODULE_URL: Final = f"{PANEL_STATIC_URL}/{PANEL_FILENAME}"
PANEL_SIDEBAR_ICON: Final = "mdi:robot-outline"

# Home Assistant's frontend service worker applies a cache-first rule with
# `ignoreSearch` to every URL containing a `/static/`, `/frontend_latest/` or
# `/frontend_es5/` segment, so neither `cache_headers=False` nor a query string
# defeats it (observed live 2026-09-12; see LOC-009). The versioned module is
# therefore served from a content-addressed *path* outside those segments.
PANEL_VERSIONED_URL_BASE: Final = f"/api/{DOMAIN}/panel"
PANEL_CACHE_BUST_LENGTH: Final = 16
