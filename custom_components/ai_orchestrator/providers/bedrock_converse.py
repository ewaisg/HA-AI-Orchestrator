"""Offline-tested Bedrock Converse adapter; host SDK/live acceptance is pending.

SDK signing and blocking I/O run in the HA executor. Cancellation cannot stop a
Python worker thread: its slot stays occupied until the bounded SDK request
finishes. No cloud route or ambient AWS credential chain is enabled here.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field
from typing import Any, Final

import voluptuous as vol
from homeassistant.core import HomeAssistant
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from ..provider_entry import ProviderConfigMode
from .contract import (
    EMPTY_REQUEST,
    CapabilityRecord,
    CapabilityState,
    ConnectionValidationResult,
    ErrorCode,
    HealthCheckResult,
    MessageRole,
    ModelCatalog,
    ProviderError,
    ProviderHealthState,
    ProviderModel,
    ProviderRequest,
    StreamEvent,
    TextGenerationResult,
    ToolCall,
    Usage,
    validate_generation_result,
)
from .openai_compatible import (
    _loads_json,
    _raise_provider_error,
    _require_empty_probe_request,
    _to_json_value,
    _validate_json_value,
)

PROVIDER_TYPE: Final = "bedrock_converse"
DISPLAY_NAME: Final = "Amazon Bedrock (cloud; catalogue test only)"
SDK_REQUIREMENT: Final = "boto3==1.42.97"
TIMEOUT_SECONDS: Final = 60
MAX_JSON_BYTES: Final = 2 * 1024 * 1024
_REQUIRED = {"region", "model_id", "access_key_id", "secret_access_key"}
_CREDENTIAL_KEYS = {"access_key_id", "secret_access_key", "session_token"}
_REGION = re.compile(r"^[a-z]{2}(?:-[a-z]+)+-[0-9]+$")


@dataclass(frozen=True, slots=True)
class BedrockConfig:
    """Explicit account configuration; all credentials are hidden in repr."""

    region: str
    model_id: str
    access_key_id: str = field(repr=False)
    secret_access_key: str = field(repr=False)
    session_token: str = field(default="", repr=False)

    @property
    def secrets(self) -> tuple[str, ...]:
        """Return configured credential values for backend-only redaction."""
        return tuple(
            value
            for value in (
                self.access_key_id,
                self.secret_access_key,
                self.session_token,
            )
            if value
        )


def parse_bedrock_config(raw: Mapping[str, object]) -> BedrockConfig:
    """Reject endpoint overrides, missing credentials, and noncanonical fields."""
    if not _REQUIRED <= set(raw) or set(raw) - (_REQUIRED | {"session_token"}):
        raise ValueError("Bedrock configuration fields are invalid")
    normalized: dict[str, str] = {}
    for key in _REQUIRED | {"session_token"}:
        value = raw.get(key, "")
        if (
            type(value) is not str
            or len(value) > 4096
            or not value.isascii()
            or (value and (not value.isprintable() or any(c.isspace() for c in value)))
        ):
            raise ValueError("Bedrock configuration values are invalid")
        if key in _REQUIRED and not value:
            raise ValueError("Bedrock configuration values are invalid")
        normalized[key] = value
    if not _REGION.fullmatch(normalized["region"]) or len(normalized["region"]) > 32:
        raise ValueError("Bedrock region is invalid")
    if len(normalized["model_id"]) > 2048 or "://" in normalized["model_id"]:
        raise ValueError("Bedrock model identity is invalid")
    config = BedrockConfig(**normalized)
    if any(
        secret in config.region or secret in config.model_id
        for secret in config.secrets
    ):
        raise ValueError("Bedrock configuration contains credential material")
    return config


def _contains_secret(value: object, secrets: tuple[str, ...]) -> bool:
    if isinstance(value, str):
        return any(secret in value for secret in secrets)
    if isinstance(value, Mapping):
        return any(
            _contains_secret(key, secrets) or _contains_secret(item, secrets)
            for key, item in value.items()
        )
    if isinstance(value, (tuple, list)):
        return any(_contains_secret(item, secrets) for item in value)
    return False


def _bounded_json(value: object) -> None:
    _validate_json_value(value)
    if len(json.dumps(value, allow_nan=False).encode()) > MAX_JSON_BYTES:
        raise ValueError("Bedrock payload exceeds the limit")


def _build_request(config: BedrockConfig, request: ProviderRequest) -> dict[str, Any]:
    messages: list[dict[str, Any]] = []
    system = []
    seen_non_system = False
    for message in request.messages:
        if message.role is MessageRole.SYSTEM:
            if seen_non_system:
                raise ValueError("System messages must precede conversation")
            system.append({"text": message.content})
            continue
        seen_non_system = True
        blocks: list[dict[str, Any]] = []
        if message.role is MessageRole.TOOL:
            role = "user"
            blocks = [
                {
                    "toolResult": {
                        "toolUseId": message.tool_call_id,
                        "content": [{"text": message.content}],
                    }
                }
            ]
        else:
            role = message.role.value
            if message.content:
                blocks.append({"text": message.content})
            for call in message.tool_calls:
                blocks.append(
                    {
                        "toolUse": {
                            "toolUseId": call.id,
                            "name": call.name,
                            "input": _to_json_value(call.arguments),
                        }
                    }
                )
        if not blocks:
            raise ValueError("Empty message is unsupported")
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"].extend(blocks)
        else:
            messages.append({"role": role, "content": blocks})
    if not messages or messages[0]["role"] != "user":
        raise ValueError("Bedrock conversation must start with a user")
    body: dict[str, Any] = {
        "modelId": config.model_id,
        "messages": messages,
        "inferenceConfig": {"maxTokens": 2048},
    }
    if system:
        body["system"] = system
    if request.tools:
        body["toolConfig"] = {
            "tools": [
                {
                    "toolSpec": {
                        "name": tool.name,
                        "description": tool.description,
                        "inputSchema": {"json": _to_json_value(tool.parameters)},
                    }
                }
                for tool in request.tools
            ]
        }
    if request.output_schema is not None:
        if _contains_secret(request.output_schema.schema, config.secrets):
            raise ValueError("Credential material is prohibited")
        body["outputConfig"] = {
            "textFormat": {
                "type": "json_schema",
                "structure": {
                    "jsonSchema": {
                        "name": request.output_schema.name,
                        "schema": json.dumps(
                            _to_json_value(request.output_schema.schema),
                            allow_nan=False,
                        ),
                    }
                },
            }
        }
    _bounded_json(body)
    if _contains_secret(body, config.secrets):
        raise ValueError("Credential material is prohibited")
    return body


def _parse_result(
    payload: dict[str, Any], request: ProviderRequest
) -> TextGenerationResult:
    stop = payload.get("stopReason")
    if stop in {"guardrail_intervened", "content_filtered"}:
        _raise_provider_error(ErrorCode.SAFETY_REFUSAL)
    if stop == "model_context_window_exceeded":
        _raise_provider_error(ErrorCode.CONTEXT_OVERFLOW)
    if stop not in {"end_turn", "stop_sequence", "tool_use"}:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    output = payload.get("output")
    if type(output) is not dict or set(output) != {"message"}:
        raise ValueError("Invalid output")
    message = output["message"]
    if (
        type(message) is not dict
        or set(message) != {"role", "content"}
        or message["role"] != "assistant"
        or type(message["content"]) is not list
        or not message["content"]
    ):
        raise ValueError("Invalid assistant output")
    texts, calls = [], []
    for block in message["content"]:
        if type(block) is not dict:
            raise ValueError("Invalid content block")
        if set(block) == {"text"} and type(block["text"]) is str:
            texts.append(block["text"])
        elif set(block) == {"toolUse"}:
            call = block["toolUse"]
            if (
                type(call) is not dict
                or set(call) != {"toolUseId", "name", "input"}
                or type(call["toolUseId"]) is not str
                or type(call["name"]) is not str
                or type(call["input"]) is not dict
            ):
                raise ValueError("Invalid tool call")
            calls.append(
                ToolCall(
                    id=call["toolUseId"], name=call["name"], arguments=call["input"]
                )
            )
        else:
            raise ValueError("Unsupported content block")
    if bool(calls) != (stop == "tool_use"):
        raise ValueError("Inconsistent tool result")
    text = "".join(texts)
    if not calls and not text.strip():
        raise ValueError("Empty text result")
    usage = None
    if "usage" in payload:
        values = payload["usage"]
        if type(values) is not dict or any(
            type(values.get(key)) is not int or values[key] < 0
            for key in ("inputTokens", "outputTokens")
        ):
            raise ValueError("Invalid usage")
        usage = Usage(
            input_tokens=values["inputTokens"], output_tokens=values["outputTokens"]
        )
    structured = _loads_json(text) if request.output_schema else None
    if request.output_schema and type(structured) is not dict:
        raise ValueError("Invalid structured output")
    result = TextGenerationResult(
        text=text, tool_calls=tuple(calls), usage=usage, structured_output=structured
    )
    validate_generation_result(request, result)
    return result


def _sdk_call(
    config: BedrockConfig, operation: str, payload: dict[str, Any]
) -> dict[str, Any]:
    """Run SDK signing/I/O in the executor, using explicit identity."""
    # Import the SDK only when this separately gated adapter is used.
    import boto3  # noqa: PLC0415
    import botocore.exceptions as exc  # noqa: PLC0415
    import botocore.session  # noqa: PLC0415
    from botocore.config import Config  # noqa: PLC0415
    from botocore.configprovider import ConstantProvider  # noqa: PLC0415

    try:
        core = botocore.session.Session()
        core.set_config_variable("config_file", os.devnull)
        core.set_config_variable("credentials_file", os.devnull)
        # A None instance variable falls through to AWS_PROFILE in the SDK's
        # provider chain; replace that chain rather than mutating process env.
        core.get_component("config_store").set_config_provider(
            "profile", ConstantProvider(None)
        )
        core.set_credentials(
            config.access_key_id, config.secret_access_key, config.session_token or None
        )
        session = boto3.Session(botocore_session=core, region_name=config.region)
        if config.region not in session.get_available_regions(
            "bedrock", partition_name="aws"
        ):
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        service = (
            "bedrock" if operation == "list_foundation_models" else "bedrock-runtime"
        )
        sdk_config = Config(
            signature_version="v4",
            auth_scheme_preference="sigv4",
            connect_timeout=5,
            read_timeout=45,
            retries={"total_max_attempts": 1, "mode": "standard"},
            proxies={},
            ignore_configured_endpoint_urls=True,
        )
        client = session.client(
            service,
            region_name=config.region,
            endpoint_url=f"https://{service}.{config.region}.amazonaws.com",
            verify=True,
            config=sdk_config,
        )
        try:
            if operation == "list_foundation_models":
                return client.list_foundation_models()
            if operation == "converse":
                return client.converse(**payload)
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        finally:
            client.close()
    except exc.ClientError as err:
        code = err.response.get("Error", {}).get("Code")
        mapping = {
            "AccessDeniedException": ErrorCode.AUTHORIZATION,
            "UnrecognizedClientException": ErrorCode.AUTHENTICATION,
            "InvalidSignatureException": ErrorCode.AUTHENTICATION,
            "ExpiredTokenException": ErrorCode.AUTHENTICATION,
            "ResourceNotFoundException": ErrorCode.NOT_FOUND,
            "ThrottlingException": ErrorCode.RATE_LIMITED,
            "ModelTimeoutException": ErrorCode.TIMEOUT,
            "ModelNotReadyException": ErrorCode.PROVIDER_UNAVAILABLE,
            "ServiceUnavailableException": ErrorCode.PROVIDER_UNAVAILABLE,
            "InternalServerException": ErrorCode.PROVIDER_UNAVAILABLE,
            "ValidationException": ErrorCode.UNSUPPORTED,
        }
        _raise_provider_error(mapping.get(code, ErrorCode.INVALID_RESPONSE))
    except exc.ConnectTimeoutError, exc.ReadTimeoutError:
        _raise_provider_error(ErrorCode.TIMEOUT)
    except exc.SSLError:
        _raise_provider_error(ErrorCode.TLS)
    except exc.EndpointConnectionError, exc.ConnectionClosedError:
        _raise_provider_error(ErrorCode.CONNECTION)
    except exc.NoCredentialsError, exc.PartialCredentialsError:
        _raise_provider_error(ErrorCode.AUTHENTICATION)
    except exc.ParamValidationError:
        _raise_provider_error(ErrorCode.UNSUPPORTED)
    except exc.BotoCoreError:
        _raise_provider_error(ErrorCode.CONNECTION)


@dataclass(slots=True)
class _WorkerGate:
    """Retain executor ownership across instances created by one adapter."""

    pending: asyncio.Future[Any] | None = None


class BedrockConverseProvider:
    """Provider contract with one retained executor slot and no cloud routing."""

    def __init__(
        self,
        hass: HomeAssistant,
        config: BedrockConfig,
        worker_gate: _WorkerGate | None = None,
    ) -> None:
        """Keep credentials backend-only and retain outstanding worker ownership."""
        self._hass = hass
        self._config = config
        self._worker_gate = worker_gate if worker_gate is not None else _WorkerGate()

    async def _request(self, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        gate = self._worker_gate
        if gate.pending is not None and not gate.pending.done():
            _raise_provider_error(ErrorCode.PROVIDER_UNAVAILABLE)
        future = self._hass.async_add_executor_job(
            _sdk_call, self._config, operation, payload
        )
        gate.pending = future

        def finished(done: asyncio.Future[Any]) -> None:
            if not done.cancelled():
                # Consume errors even after caller cancellation.
                done.exception()
            if gate.pending is done:
                gate.pending = None

        future.add_done_callback(finished)
        try:
            async with asyncio.timeout(TIMEOUT_SECONDS):
                # wait() does not cancel its input on caller cancellation. HA's
                # shield wrapper logs abandoned failures, including raw SDK text.
                await asyncio.wait((future,))
                response = future.result()
        except asyncio.CancelledError:
            raise
        except TimeoutError:
            _raise_provider_error(ErrorCode.TIMEOUT)
        except ProviderError:
            raise
        except Exception:  # noqa: BLE001 -- SDK internals remain backend-only.
            _raise_provider_error(ErrorCode.CONNECTION)
        if type(response) is not dict:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            _bounded_json(response)
            if _contains_secret(response, self._config.secrets):
                raise ValueError("Credential material in output")
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        return response

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        """Prove only authenticated catalogue access, not configured-model inference."""
        _require_empty_probe_request(request)
        await self.discover_models()
        return ConnectionValidationResult(reachable=True, authenticated=True)

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        """List foundation models without inferring configured-model readiness."""
        _require_empty_probe_request(request)
        response = await self._request("list_foundation_models", {})
        values = response.get("modelSummaries")
        if type(values) is not list or len(values) > 10000:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            models = []
            for item in values:
                if (
                    type(item) is not dict
                    or type(item.get("modelId")) is not str
                    or type(item.get("modelName")) is not str
                ):
                    raise ValueError("Invalid model catalogue")
                models.append(
                    ProviderModel(id=item["modelId"], display_name=item["modelName"])
                )
            return ModelCatalog(tuple(models))
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        """Leave generation, tools, structured output and usage unverified."""
        _require_empty_probe_request(request)
        return CapabilityRecord(
            text_generation=CapabilityState.UNKNOWN,
            model_discovery=CapabilityState.SUPPORTED,
            streaming=CapabilityState.UNKNOWN,
            structured_output=CapabilityState.UNKNOWN,
            tool_calling=CapabilityState.UNKNOWN,
            usage=CapabilityState.UNKNOWN,
        )

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        """Report authenticated catalogue access only."""
        await self.validate_connection(request)
        return HealthCheckResult(ProviderHealthState.HEALTHY)

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        """Normalize Converse requests/results without performing any tool action."""
        try:
            body = _build_request(self._config, request)
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        payload = await self._request("converse", body)
        try:
            result = _parse_result(payload, request)
            normalized = {
                "text": result.text,
                "structured": result.structured_output,
                "calls": [
                    {"id": call.id, "name": call.name, "arguments": call.arguments}
                    for call in result.tool_calls
                ],
            }
            if _contains_secret(normalized, self._config.secrets):
                raise ValueError("Credential material in output")
            return result
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        """Keep streaming unavailable until its separate lifecycle is verified."""
        del request
        _raise_provider_error(ErrorCode.UNSUPPORTED)
        if False:  # pragma: no cover
            yield


@dataclass(frozen=True, slots=True)
class BedrockConverseProviderEntryAdapter:
    """Configure explicit credentials without opting any workflow into cloud."""

    hass: HomeAssistant = field(repr=False)
    provider_type: str = PROVIDER_TYPE
    display_name: str = DISPLAY_NAME
    chat_destination: None = None
    _worker_gate: _WorkerGate = field(default_factory=_WorkerGate, repr=False)

    def config_schema(self, mode: ProviderConfigMode) -> vol.Schema:
        """Use empty credential selectors with no stored values or implicit identity."""
        schema = {}
        for key in ("access_key_id", "secret_access_key", "session_token"):
            marker = (
                vol.Optional(key, default="")
                if key == "session_token"
                else vol.Required(key)
            )
            schema[marker] = TextSelector(
                TextSelectorConfig(type=TextSelectorType.PASSWORD)
            )
        if mode is not ProviderConfigMode.REAUTH:
            for key in ("region", "model_id"):
                schema[vol.Required(key)] = TextSelector(
                    TextSelectorConfig(type=TextSelectorType.TEXT)
                )
        return vol.Schema(schema)

    def normalize_config(
        self,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> Mapping[str, object]:
        """Allow only credential replacement during reauthentication."""
        if mode is ProviderConfigMode.REAUTH:
            if (
                current_config is None
                or not {"access_key_id", "secret_access_key"} <= set(user_input)
                or set(user_input) - _CREDENTIAL_KEYS
            ):
                raise ValueError("Bedrock reauthentication fields are invalid")
            candidate = {**current_config, "session_token": "", **user_input}
        else:
            candidate = dict(user_input)
        config = parse_bedrock_config(candidate)
        return {
            "region": config.region,
            "model_id": config.model_id,
            "access_key_id": config.access_key_id,
            "secret_access_key": config.secret_access_key,
            "session_token": config.session_token,
        }

    async def async_create_provider(
        self, config: Mapping[str, object]
    ) -> BedrockConverseProvider:
        """Create a provider without SDK/client creation or credential discovery."""
        return BedrockConverseProvider(
            self.hass, parse_bedrock_config(config), self._worker_gate
        )
