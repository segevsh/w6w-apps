import { generationAction, modelParam, MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  videoUri?: string;
  promptVideo?: string;
  promptText?: string;
  ratio?: string;
  duration?: number;
  mode?: string;
  resolution?: string;
  audio?: boolean;
  seed?: number;
  publicFigureThreshold?: string;
}

/**
 * `POST /v1/video_to_video`. The input video field is named per model (OpenAPI, 2026-10-06):
 * `aleph2`, `gemini_omni_flash` and `gemini_omni_flash_1.1` take `videoUri`; `hailuo3`,
 * `seedance2*` take `promptVideo`. Exactly one of the two is required here.
 */
export default generationAction<Input>({
  key: "video-to-video",
  title: "Video to Video",
  description: "Start a generation that transforms or extends an input video.",
  path: "/v1/video_to_video",
  params: [
    modelParam("A video-to-video model id: aleph2, hailuo3, seedance2, gemini_omni_flash, ..."),
    {
      key: "videoUri",
      label: "Video URI",
      type: "string",
      hint: "For aleph2 / gemini_omni_flash*.",
    },
    {
      key: "promptVideo",
      label: "Prompt video",
      type: "string",
      hint: "For hailuo3 / seedance2*.",
    },
    { key: "promptText", label: "Prompt", type: "text" },
    { key: "ratio", label: "Ratio", type: "string" },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 1, max: 30, integer: true },
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "reference", label: "reference" },
        { value: "extend", label: "extend" },
        { value: "edit", label: "edit" },
      ],
      hint: "Models that support a mode.",
    },
    { key: "resolution", label: "Resolution", type: "string" },
    { key: "audio", label: "Generate audio", type: "boolean" },
    SEED,
    MODERATION,
  ],
  build: (i) => {
    if (!String(i.videoUri ?? "").trim() && !String(i.promptVideo ?? "").trim()) {
      throw new Error("videoUri or promptVideo is required (the field name depends on the model)");
    }
    return {
      videoUri: i.videoUri,
      promptVideo: i.promptVideo,
      promptText: i.promptText,
      ratio: i.ratio,
      duration: i.duration,
      mode: i.mode,
      resolution: i.resolution,
      audio: i.audio,
      seed: i.seed,
      contentModeration: moderation(i.publicFigureThreshold),
    };
  },
});
