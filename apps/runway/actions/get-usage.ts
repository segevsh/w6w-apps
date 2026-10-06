import type { ActionDefinition } from "@w6w/types";
import { compact, RunwayClient } from "../lib/client.ts";

interface Input {
  startDate?: string;
  beforeDate?: string;
}

/**
 * `POST /v1/organization/usage` — a read despite the verb. Up to 90 days per query; dates are
 * `YYYY-MM-DD`, `beforeDate` exclusive.
 */
const getUsage: ActionDefinition<Input> = {
  key: "get-usage",
  type: "read",
  resource: "organization",
  title: "Query Credit Usage",
  description: "Credit usage per model and day for the API key's organization (up to 90 days).",
  params: [
    { key: "startDate", label: "Start date", type: "string", hint: "YYYY-MM-DD." },
    { key: "beforeDate", label: "Before date", type: "string", hint: "YYYY-MM-DD, exclusive." },
  ],
  output: [
    { key: "results", type: "array", label: "Per-day credits used per model" },
    { key: "models", type: "array", label: "Models in the results" },
    { key: "apiKeys", type: "array", label: "API key ids in the results" },
    { key: "resultsByApiKey", type: "array", label: "Per-day credits used per API key" },
  ],

  async execute(input, ctx) {
    const { data } = await new RunwayClient(ctx).request("/v1/organization/usage", {
      method: "POST",
      body: compact({ startDate: input.startDate?.trim(), beforeDate: input.beforeDate?.trim() }),
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      results: d.results ?? [],
      models: d.models ?? [],
      apiKeys: d.apiKeys,
      resultsByApiKey: d.resultsByApiKey,
    };
  },
};

export default getUsage;
