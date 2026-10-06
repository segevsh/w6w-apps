import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/**
 * `GET /v3/info/{feature}/{subfeature}` - PUBLIC. The authoritative source for what to put in the
 * `input` of Run Expert Model / Start Async Job for that feature.
 */
interface Input {
  feature: string;
  subfeature: string;
}

interface FeatureInfo {
  mode?: string;
  description?: string | null;
  endpoints?: unknown;
  input_schema?: unknown;
  output_schema?: unknown;
  models?: unknown[];
  provider_params?: unknown;
}

const featureGet: ActionDefinition<Input> = {
  key: "feature-get",
  type: "read",
  resource: "universal-ai",
  title: "Get Feature Info",
  description:
    "Get an expert-model feature's input fields, output schema, providers with pricing, and accepted provider parameters.",
  params: [
    { key: "feature", label: "Feature", type: "string", required: true, hint: "e.g. ocr" },
    {
      key: "subfeature",
      label: "Subfeature",
      type: "string",
      required: true,
      hint: "e.g. identity_parser",
    },
  ],
  output: [
    { key: "mode", type: "string", label: "sync or async" },
    { key: "inputSchema", type: "object", label: "Input fields" },
    { key: "outputSchema", type: "object", label: "Output schema" },
    { key: "models", type: "array", label: "Models (id, pricing, regions)" },
    { key: "providerParams", type: "object", label: "Accepted provider parameters" },
    { key: "endpoints", type: "object", label: "Endpoints to call" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<FeatureInfo>(
      `/info/${encodeURIComponent(input.feature)}/${encodeURIComponent(input.subfeature)}`,
    );
    return {
      mode: res.mode,
      description: res.description ?? undefined,
      inputSchema: res.input_schema,
      outputSchema: res.output_schema,
      models: res.models ?? [],
      providerParams: res.provider_params ?? undefined,
      endpoints: res.endpoints,
    };
  },
};

export default featureGet;
