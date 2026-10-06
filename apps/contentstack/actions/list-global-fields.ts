import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, str } from "../lib/client.ts";

/**
 * `GET /v3/global_fields` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-global-fields",
  type: "read",
  resource: "global_field",
  title: "List Global Fields",
  description: "Global fields in the stack.",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    { key: "includeGlobalFieldSchema", label: "Include global field schema", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "global_fields", type: "array", label: "Global fields" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const includeGlobalFieldSchema = bool(p.includeGlobalFieldSchema);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack List Global Fields");
    return await call(ctx, "GET", "/global_fields", {
      query: { include_count: includeCount, include_global_field_schema: includeGlobalFieldSchema },
      branch,
    });
  },
};

export default action;
