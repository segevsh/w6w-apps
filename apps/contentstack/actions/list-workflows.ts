import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /v3/workflows` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-workflows",
  type: "read",
  resource: "workflow",
  title: "List Workflows",
  description: "Workflows defined on the stack.",
  params: [],
  output: [
    { key: "workflows", type: "array", label: "Workflows" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Contentstack List Workflows");
    return await call(ctx, "GET", "/workflows");
  },
};

export default action;
