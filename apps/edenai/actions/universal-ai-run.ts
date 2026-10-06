import type { ActionDefinition } from "@w6w/types";
import { parseJson } from "../lib/client.ts";
import { commonParams, runUniversal, shapeSync } from "../lib/universal.ts";

/**
 * `POST /v3/universal-ai` - any synchronous expert model.
 *
 * The escape hatch for every feature this app has no dedicated action for (image analysis, face
 * detection, background removal, financial parsing, ...). The `input` object is the feature's own
 * field list; read it from Get Feature Info.
 */
interface Input {
  feature: string;
  subfeature: string;
  input: unknown;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

const universalAiRun: ActionDefinition<Input> = {
  key: "universal-ai-run",
  type: "perform",
  resource: "universal-ai",
  title: "Run Expert Model (Universal AI)",
  description:
    "Run any synchronous non-LLM feature by name. Use Get Feature Info to see a feature's input fields and providers.",
  idempotent: false,
  params: [
    { key: "feature", label: "Feature", type: "string", required: true, hint: "e.g. image" },
    {
      key: "subfeature",
      label: "Subfeature",
      type: "string",
      required: true,
      hint: "e.g. background_removal",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: 'The feature\'s own fields, e.g. {"file": "https://example.com/photo.jpg"}.',
    },
    ...commonParams("", "The provider id, as listed by Get Feature Info.").map((p) =>
      p.key === "provider" ? { ...p, default: undefined } : p
    ),
  ],
  output: [
    { key: "output", type: "object", label: "Normalized provider output" },
    { key: "provider", type: "string", label: "Provider that served the call" },
    { key: "cost", type: "number", label: "Cost in credits (USD)" },
    { key: "feature", type: "string", label: "Feature" },
    { key: "subfeature", type: "string", label: "Subfeature" },
  ],
  async execute(input, ctx) {
    const body = parseJson<Record<string, unknown>>(input.input, "Input");
    if (!body || typeof body !== "object") throw new Error("Input must be a JSON object");
    const res = await runUniversal(ctx, {
      feature: input.feature,
      subfeature: input.subfeature,
      provider: input.provider,
      fallbacks: input.fallbacks,
      providerParams: input.providerParams,
      input: body,
    });
    return shapeSync(res);
  },
};

export default universalAiRun;
