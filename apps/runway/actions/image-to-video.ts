import { mediaInput, need } from "../lib/client.ts";
import { generationAction, modelParam, MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  promptImage: string;
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
 * `POST /v1/image_to_video`. `promptImage` is a URL / `runway://` upload URI / data URI, or an
 * array of `{ uri, position }` frames (pass it as JSON text). Per-model required fields:
 * `gen4.5` needs `promptText`, `ratio` and `duration`; `gen4_turbo`, `veo3.1` and `veo3.1_fast`
 * need `ratio`; `hailuo3`, `wan3` and a few others need `promptText`.
 */
export default generationAction<Input>({
  key: "image-to-video",
  title: "Image to Video",
  description: "Start a video generation that animates a first frame (or keyframes).",
  path: "/v1/image_to_video",
  params: [
    modelParam("An image-to-video model id, e.g. gen4.5, gen4_turbo, veo3.1, seedance2."),
    {
      key: "promptImage",
      label: "Prompt image",
      type: "string",
      required: true,
      hint: "HTTPS URL, runway:// upload URI or data URI. JSON text for an array of " +
        '{"uri","position"} frames.',
    },
    { key: "promptText", label: "Prompt", type: "text" },
    {
      key: "ratio",
      label: "Ratio",
      type: "string",
      hint: "e.g. 1280:720. Valid values depend on the model.",
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 1, max: 30, integer: true },
    },
    { key: "audio", label: "Generate audio", type: "boolean" },
    { key: "resolution", label: "Resolution", type: "string" },
    { key: "negativePrompt", label: "Negative prompt", type: "text" },
    SEED,
    { key: "outputFormat", label: "Output format", type: "string" },
    MODERATION,
  ],
  build: (i) => {
    need(i.promptImage, "promptImage");
    return {
      promptImage: mediaInput(i.promptImage),
      promptText: i.promptText,
      ratio: i.ratio,
      duration: i.duration,
      audio: i.audio,
      resolution: i.resolution,
      negativePrompt: i.negativePrompt,
      seed: i.seed,
      outputFormat: i.outputFormat,
      contentModeration: moderation(i.publicFigureThreshold),
    };
  },
});
