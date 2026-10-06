import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient } from "../lib/client.ts";

/** `POST /v3/images/generations` - OpenAI-compatible; a provider returns `url` or `b64_json`. */
interface Input {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
}

interface ImageBody {
  data?: Array<{ url?: string | null; b64_json?: string | null; revised_prompt?: string | null }>;
  cost?: number | null;
  provider?: string | null;
}

const imageGenerate: ActionDefinition<Input> = {
  key: "image-generate",
  type: "perform",
  resource: "image",
  title: "Generate Image",
  description: "Generate images from a text prompt with any supported image model.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/gpt-image-2",
      hint: "provider/model. The current ids are listed at GET /v3/images/models.",
    },
    { key: "prompt", label: "Prompt", type: "text", required: true },
    { key: "n", label: "Number of images", type: "number", validation: { min: 1, integer: true } },
    {
      key: "size",
      label: "Size",
      type: "string",
      hint: "Provider-specific, e.g. 1024x1024 or 1536x1024 for OpenAI.",
    },
    {
      key: "quality",
      label: "Quality",
      type: "string",
      hint: "Provider-specific, e.g. low, medium, high, standard, hd.",
    },
  ],
  output: [
    { key: "images", type: "array", label: "Images (url or b64_json, revised_prompt)" },
    { key: "urls", type: "array", label: "Image URLs, where the provider returns URLs" },
    { key: "cost", type: "number", label: "Cost (USD)" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<ImageBody>("/images/generations", {
      method: "POST",
      body: compact({
        model: input.model,
        prompt: input.prompt,
        n: input.n,
        size: input.size,
        quality: input.quality,
      }),
    });
    const images = res.data ?? [];
    return {
      images,
      urls: images.map((i) => i.url).filter((u): u is string => !!u),
      cost: res.cost ?? undefined,
      provider: res.provider ?? undefined,
    };
  },
};

export default imageGenerate;
