import { need } from "../lib/client.ts";
import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  mediaType: string;
  mediaUri: string;
  presetVoiceId: string;
  removeBackgroundNoise?: boolean;
}

/** `POST /v1/speech_to_speech` — `media` is `{ type: "audio"|"video", uri }`. */
export default generationAction<Input>({
  key: "speech-to-speech",
  title: "Speech to Speech",
  description: "Re-voice the dialogue in an audio or video file with a preset voice.",
  path: "/v1/speech_to_speech",
  params: [
    modelParam("The speech-to-speech model id.", "eleven_multilingual_sts_v2"),
    {
      key: "mediaType",
      label: "Media type",
      type: "select",
      required: true,
      default: "audio",
      options: [{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }],
    },
    { key: "mediaUri", label: "Media URI", type: "string", required: true },
    {
      key: "presetVoiceId",
      label: "Preset voice",
      type: "string",
      required: true,
      hint: "A Runway preset voice name, e.g. Maya.",
    },
    { key: "removeBackgroundNoise", label: "Remove background noise", type: "boolean" },
  ],
  build: (i) => ({
    media: { type: need(i.mediaType, "mediaType"), uri: need(i.mediaUri, "mediaUri") },
    voice: { type: "runway-preset", presetId: need(i.presetVoiceId, "presetVoiceId") },
    removeBackgroundNoise: i.removeBackgroundNoise,
  }),
});
