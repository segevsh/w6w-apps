import type { ActionDefinition } from "@w6w/types";
import { compact, XaiClient } from "../lib/client.ts";

interface Input {
  prompt: string;
  model?: string;
  n?: number;
  responseFormat?: string;
  aspectRatio?: string;
  resolution?: string;
}

const ASPECT_RATIOS = [
  "1:1",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
  "2:3",
  "3:2",
  "9:19.5",
  "19.5:9",
  "9:20",
  "20:9",
  "1:2",
  "2:1",
  "21:9",
  "5:2",
  "auto",
];

/** POST /v1/images/generations. Aspect ratio and resolution: grok-imagine models only. */
const generateImage: ActionDefinition<Input> = {
  key: "generate-image",
  type: "perform",
  resource: "image",
  title: "Generate Image",
  description: "Generate images from a prompt (POST /v1/images/generations).",
  idempotent: false,
  params: [
    { key: "prompt", label: "Prompt", type: "text", required: true },
    { key: "model", label: "Model", type: "string", hint: "An image generation model id." },
    { key: "n", label: "Number of images", type: "number", validation: { min: 1, integer: true } },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [{ value: "url", label: "URL" }, { value: "b64_json", label: "Base64 JSON" }],
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      type: "select",
      hint: "grok-imagine models only.",
      options: ASPECT_RATIOS.map((r) => ({ value: r, label: r })),
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      hint: "grok-imagine models only.",
      options: ["1k", "1.5k", "2k"].map((r) => ({ value: r, label: r })),
    },
  ],
  output: [{ key: "data", type: "array", label: "Generated images" }],

  execute(input, ctx) {
    const body = compact({
      prompt: input.prompt,
      model: input.model,
      n: input.n,
      response_format: input.responseFormat,
      aspect_ratio: input.aspectRatio,
      resolution: input.resolution,
    });
    return new XaiClient(ctx).request("/v1/images/generations", { method: "POST", body });
  },
};

export default generateImage;
