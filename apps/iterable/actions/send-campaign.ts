import type { ActionDefinition } from "@w6w/types";
import { call, int } from "../lib/client.ts";

/**
 * `POST /api/campaigns/{campaignId}/send` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "send-campaign",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign Now",
  description: "Send an existing campaign immediately.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "number", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = int("campaignId", p.campaignId);
    if (campaignId === undefined) throw new Error("`campaignId` is required");
    ctx.log("info", "Iterable Send Campaign Now", { campaignId });
    const out = await call(
      ctx,
      "POST",
      `/campaigns/${encodeURIComponent(String(campaignId))}/send`,
    );
    return out;
  },
};

export default action;
