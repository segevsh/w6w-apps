import type { ActionDefinition } from "@w6w/types";
import { call, int } from "../lib/client.ts";

/**
 * `GET /api/campaigns/{id}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "One campaign by id.",
  params: [
    { key: "id", label: "Campaign ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign id" },
    { key: "name", type: "string", label: "Name" },
    { key: "campaignState", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = int("id", p.id);
    if (id === undefined) throw new Error("`id` is required");
    ctx.log("info", "Iterable Get Campaign", { id });
    const out = await call(ctx, "GET", `/campaigns/${encodeURIComponent(String(id))}`);
    return out;
  },
};

export default action;
