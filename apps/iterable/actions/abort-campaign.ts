import type { ActionDefinition } from "@w6w/types";
import { call, compact, int } from "../lib/client.ts";

/**
 * `POST /api/campaigns/abort` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "abort-campaign",
  type: "perform",
  resource: "campaign",
  title: "Abort Campaign",
  description: "Abort a running campaign.",
  idempotent: true,
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
    ctx.log("info", "Iterable Abort Campaign", { campaignId });
    const out = await call(ctx, "POST", "/campaigns/abort", {
      body: compact({ "campaignId": campaignId }),
    });
    return out;
  },
};

export default action;
