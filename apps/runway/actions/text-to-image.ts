import { jsonInput } from "../lib/client.ts";
import { generationAction, modelParam, MODERATION, moderation, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  promptText: string;
  ratio: string;
  referenceImages?: unknown;
  quality?: string;
  background?: string;
  outputCount?: number;
  outputFormat?: string;
  seed?: number;
  publicFigureThreshold?: string;
}

/**
 * `POST /v1/text_to_image` (the reference calls it "Text/Image to Image"). `promptText` and
 * `ratio` are required by every model variant; `gen4_image_turbo` also requires
 * `referenceImages`. `quality`, `background`, `outputCount` and `outputFormat` exist on only
 * some models.
 */
export default generationAction<Input>({
  key: "text-to-image",
  title: "Text to Image",
  description: "Start an image generation from a prompt and optional reference images.",
  path: "/v1/text_to_image",
  params: [
    modelParam("An image model id, e.g. gen4_image, gen4_image_turbo, gpt_image_2, seedream5_pro."),
    { key: "promptText", label: "Prompt", type: "text", required: true },
    {
      key: "ratio",
      label: "Ratio",
      type: "string",
      required: true,
      hint: "width:height, e.g. 1920:1080 or 1024:1024. Valid values depend on the model.",
    },
    {
      key: "referenceImages",
      label: "Reference images (JSON)",
      type: "json",
      hint: 'An array of {"uri": "...", "tag": "..."}. Required for gen4_image_turbo.',
    },
    {
      key: "quality",
      label: "Quality",
      type: "select",
      options: ["low", "medium", "high", "auto"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "background",
      label: "Background",
      type: "select",
      options: ["transparent", "opaque", "auto"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "outputCount",
      label: "Output count",
      type: "number",
      validation: { min: 1, max: 10, integer: true },
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: ["webp", "png", "jpeg"].map((v) => ({ value: v, label: v })),
    },
    SEED,
    MODERATION,
  ],
  build: (i) => ({
    promptText: i.promptText,
    ratio: i.ratio,
    referenceImages: jsonInput(i.referenceImages, "referenceImages"),
    quality: i.quality,
    background: i.background,
    outputCount: i.outputCount,
    outputFormat: i.outputFormat,
    seed: i.seed,
    contentModeration: moderation(i.publicFigureThreshold),
  }),
});
