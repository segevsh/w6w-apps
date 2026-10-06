import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, str } from "../lib/client.ts";

/**
 * `GET /v3/locales` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-locales",
  type: "read",
  resource: "locale",
  title: "List Locales",
  description: "Languages added to the stack.",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "locales", type: "array", label: "Locales (code, name, fallback_locale)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Locales");
    return await call(ctx, "GET", "/locales", { query: { include_count: includeCount }, branch });
  },
};

export default action;
