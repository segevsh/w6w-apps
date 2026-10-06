import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/** `POST /v3/moderations` - OpenAI-compatible; the model defaults to `openai/omni-moderation-latest`. */
interface Input {
  input: string;
  model?: string;
}

interface ModerationBody {
  id?: string;
  model?: string;
  results?: Array<{
    flagged?: boolean | null;
    categories?: Record<string, unknown> | null;
    category_scores?: Record<string, unknown> | null;
  }>;
  cost?: number | null;
  provider?: string | null;
}

const moderationCreate: ActionDefinition<Input> = {
  key: "moderation-create",
  type: "perform",
  resource: "llm",
  title: "Moderate Content",
  description: "Classify text for harmful content (violence, hate, self-harm, sexual content).",
  idempotent: false,
  params: [
    { key: "input", label: "Text", type: "text", required: true },
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "openai/omni-moderation-latest",
      hint: "provider/model. The current ids are listed at GET /v3/moderations/models.",
    },
  ],
  output: [
    { key: "flagged", type: "boolean", label: "Flagged by the model" },
    { key: "categories", type: "object", label: "Category flags" },
    { key: "categoryScores", type: "object", label: "Category scores" },
    { key: "model", type: "string", label: "Model" },
    { key: "cost", type: "number", label: "Cost (USD)" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<ModerationBody>("/moderations", {
      method: "POST",
      body: { input: input.input, model: input.model || "openai/omni-moderation-latest" },
    });
    const first = res.results?.[0];
    return {
      flagged: first?.flagged ?? false,
      categories: first?.categories ?? undefined,
      categoryScores: first?.category_scores ?? undefined,
      model: res.model,
      cost: res.cost ?? undefined,
      provider: res.provider ?? undefined,
    };
  },
};

export default moderationCreate;
