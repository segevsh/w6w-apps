import type { ActionDefinition } from "@w6w/types";
import { call, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/environments/{environmentName}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-environment",
  type: "read",
  resource: "environment",
  title: "Get Environment",
  description: "One environment by name.",
  params: [
    { key: "environmentName", label: "Environment name", type: "string", required: true },
  ],
  output: [
    { key: "environment", type: "object", label: "The environment" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const environmentName = need("environmentName", str(p.environmentName));
    ctx.log("info", "Contentstack Get Environment", { environmentName });
    return await call(ctx, "GET", `/environments/${seg(environmentName)}`);
  },
};

export default action;
