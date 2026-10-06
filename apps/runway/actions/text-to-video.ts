import { generationAction, modelParam, MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  promptText?: string;
  ratio?: string;
  duration?: number;
  audio?: boolean;
  resolution?: string;
  negativePrompt?: string;
  seed?: number;
  outputFormat?: string;
  publicFigureThreshold?: string;
}

/**
 * `POST /v1/text_to_video`. Per-model required fields (OpenAPI, 2026-10-06): `gen4.5` needs
 * `promptText`, `ratio` and `duration`; `veo3.1` / `veo3.1_fast` need `promptText` and `ratio`;
 * most others need only `promptText`; `seedance2_5` needs only `model` (a draft can be
 * enhanced with `draftTaskId` alone — pass it in `extra`).
 */
export default generationAction<Input>({
  key: "text-to-video",
  title: "Text to Video",
  description: "Start a video generation from a text prompt.",
  path: "/v1/text_to_video",
  params: [
    modelParam("A text-to-video model id, e.g. gen4.5, veo3.1, seedance2, grok_imagine_1_5."),
    { key: "promptText", label: "Prompt", type: "text", hint: "Max length depends on the model." },
    {
      key: "ratio",
      label: "Ratio",
      type: "string",
      hint: "width:height, e.g. 1280:720. Valid values depend on the model.",
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 1, max: 30, integer: true },
    },
    {
      key: "audio",
      label: "Generate audio",
      type: "boolean",
      hint: "Models that support audio only.",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "string",
      hint: "e.g. 768p or 2k, models that support it.",
    },
    { key: "negativePrompt", label: "Negative prompt", type: "text" },
    SEED,
    {
      key: "outputFormat",
      label: "Output format",
      type: "string",
      hint: "e.g. mp4, prores, hdr10 (gen4.5).",
    },
    MODERATION,
  ],
  build: (i) => ({
    promptText: i.promptText,
    ratio: i.ratio,
    duration: i.duration,
    audio: i.audio,
    resolution: i.resolution,
    negativePrompt: i.negativePrompt,
    seed: i.seed,
    outputFormat: i.outputFormat,
    contentModeration: moderation(i.publicFigureThreshold),
  }),
});
