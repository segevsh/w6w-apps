import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";
import { asObject, buildQuery, type QueryInput, queryParams } from "../lib/params.ts";

interface Input extends QueryInput {
  url: string;
  config?: Record<string, unknown> | string;
  budgets?: unknown;
}

const performance: ActionDefinition<Input> = {
  key: "performance",
  type: "read",
  resource: "page",
  title: "Run Lighthouse Audit",
  description:
    "Run a Lighthouse audit of a URL (performance, accessibility, SEO, best practices) and " +
    "return the report.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
    },
    {
      key: "config",
      label: "Lighthouse config (JSON)",
      type: "json",
      hint:
        'A Lighthouse config, e.g. `{"extends":"lighthouse:default","settings":{"onlyCategories":["performance"]}}`.',
    },
    {
      key: "budgets",
      label: "Budgets (JSON)",
      type: "json",
      hint: "A Lighthouse performance-budget array.",
    },
    ...queryParams,
  ],
  output: [
    { key: "data", type: "object", label: "Lighthouse report" },
  ],

  async execute(input, ctx) {
    if (!input.url?.trim()) throw new Error("URL is required");
    const config = asObject(input.config, "Lighthouse config");
    let budgets = input.budgets;
    if (typeof budgets === "string") {
      try {
        budgets = JSON.parse(budgets);
      } catch {
        throw new Error("Budgets must be valid JSON");
      }
    }
    if (budgets !== undefined && !Array.isArray(budgets)) {
      throw new Error("Budgets must be a JSON array");
    }
    const data = await new BrowserlessClient(ctx).json("/performance", {
      method: "POST",
      query: buildQuery(input),
      body: {
        url: input.url.trim(),
        ...(config ? { config } : {}),
        ...(budgets ? { budgets } : {}),
      },
    });
    return { data };
  },
};

export default performance;
