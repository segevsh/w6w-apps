import type { ActionDefinition } from "@w6w/types";
import { bool, call, str } from "../lib/client.ts";

/**
 * `GET /v3/environments` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-environments",
  type: "read",
  resource: "environment",
  title: "List Environments",
  description: "Publishing environments of the stack.",
  params: [
    {
      key: "includeCount",
      label: "Include count",
      type: "boolean",
      hint: "Include the total count in the response.",
    },
    { key: "asc", label: "Asc", type: "string" },
    { key: "desc", label: "Desc", type: "string" },
  ],
  output: [
    { key: "environments", type: "array", label: "Environments (name, uid, urls)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const includeCount = bool(p.includeCount);
    const asc = str(p.asc);
    const desc = str(p.desc);
    ctx.log("info", "Contentstack List Environments");
    return await call(ctx, "GET", "/environments", {
      query: { include_count: includeCount, asc, desc },
    });
  },
};

export default action;
