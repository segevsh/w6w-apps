import type { ActionDefinition } from "@w6w/types";
import { call, intList, str } from "../lib/client.ts";

/**
 * `GET /api/campaigns/metrics` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-campaign-metrics",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Metrics",
  description:
    "Metrics for campaigns, returned by Iterable as CSV text. Rate limit: 10 requests/minute per project.",
  params: [
    {
      key: "campaignId",
      label: "Campaign IDs",
      type: "string",
      required: true,
      hint: "Comma separated campaign ids.",
    },
    { key: "startDateTime", label: "Start", type: "string", hint: "YYYY-MM-DD or ISO 8601." },
    { key: "endDateTime", label: "End", type: "string", hint: "YYYY-MM-DD or ISO 8601." },
  ],
  output: [
    { key: "csv", type: "string", label: "CSV metrics" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = intList("campaignId", p.campaignId);
    const startDateTime = str(p.startDateTime);
    const endDateTime = str(p.endDateTime);
    if (campaignId === undefined) throw new Error("`campaignId` is required");
    ctx.log("info", "Iterable Get Campaign Metrics");
    const out = await call(ctx, "GET", "/campaigns/metrics", {
      query: {
        "campaignId": campaignId,
        "startDateTime": startDateTime,
        "endDateTime": endDateTime,
      },
      text: true,
    });
    return { csv: String(out.text ?? "") };
  },
};

export default action;
