# Samsung and Echo voice setup

## Current configuration

A separate assistant named **Local AI + home control** was created on the
observed Home Assistant Core 2026.11.0 instance. It selects the existing LM Studio
conversation entity, enables **Prefer handling commands locally**, and uses the
already configured Home Assistant Cloud speech-to-text and text-to-speech engines.
The older assistants were preserved. This is local model inference with cloud
speech, not a fully local audio pipeline.

Home Assistant handles recognized home-control sentences first. Other messages
go to the Orchestrator's text-only LM Studio conversation entity. That entity
does not receive household state or device tools. This pipeline uses the existing
Assist exposure list, not a new per-pipeline entity allowlist. No exposure or
action grant was added when creating it.

## Samsung: first test

1. Open the Home Assistant Companion app and open Assist (usually in the top-right menu).
2. Select **Local AI + home control** in the assistant selector.
3. Tap the microphone and speak a command for an already exposed harmless test light.
4. Verify the physical light and listen for the spoken reply. A successful text
   request does not establish microphone, transcription or audio-playback acceptance.
5. Ask an ordinary question to check the local-model fallback separately.

After push-to-talk works, Android's Companion app can be set as the default
digital assistant under **Settings → Companion app → Assist for Android**.
Wake-word detection can then be enabled there with an available phrase such as
Hey Jarvis or Hey Nabu. Wake-word detection is experimental and increases battery
use. These phone settings have not been changed remotely.

## Echo: separate Alexa device-control route

The existing Home Assistant Cloud Alexa connection was observed disabled.
Enabling it can reactivate a saved exposure list, so approval and review are
required before changing it. After enabling, review the Alexa-exposed entities
and select the intended test light. In the phone's Alexa app, enable/link the
Home Assistant Smart Home skill with the owner's Nabu Casa account, then discover
devices. Test an explicit command such as “Alexa, turn off [test light]”.

This enables Alexa device control through Amazon. It does not route arbitrary
Echo conversations, microphone audio or workflow-authoring requests to LM Studio.
Those capabilities require a separately designed conversation/custom-skill bridge.
Announcement output from an Echo is also not evidence of voice-input support.

## Rollback

Select the previous assistant on the phone and remove only the newly created
pipeline if desired. Restore the phone's previous default assistant to disable
Assist wake-word detection. For Alexa, disable the Cloud Alexa connection and
restore its prior exposure list; unlink the skill in the Alexa app if it was
linked only for the experiment. Restoring configuration does not restore a
light's physical state.

## Official references

- [Assist on Android](https://www.home-assistant.io/voice_control/android/)
- [Home Assistant Alexa overview](https://www.home-assistant.io/integrations/alexa/)
- [Nabu Casa Alexa setup](https://support.nabucasa.com/hc/en-us/articles/25619363899677-Configuring-Amazon-Alexa-to-work-with-Home-Assistant)
- [Fully local speech alternatives](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/)

Status: assistant configuration saved; owner Samsung speech/physical acceptance
and Alexa permission/linking acceptance remain pending. No complete voice or
Echo-local-LLM acceptance is claimed.

Follow-up: a typed request through **Local AI + home control**, “Turn off Loft”,
returned “Turned off the light”. The separate Loft entity dialog then reported
Off. This proves the selected pipeline's command path, not phone microphone,
speech recognition, spoken reply or physical-device acceptance. The owner chose
to finish Samsung first and keep Alexa disabled.
