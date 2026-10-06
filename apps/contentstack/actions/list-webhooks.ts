import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /v3/webhooks` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "Webhooks configured on the stack.",
  params: [],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Contentstack List Webhooks");
    return await call(ctx, "GET", "/webhooks");
  },
};

export default action;
