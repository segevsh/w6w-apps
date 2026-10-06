import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, intList, jsonObject } from "../lib/client.ts";

/**
 * `POST /api/campaigns/trigger` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "trigger-campaign",
  type: "perform",
  resource: "campaign",
  title: "Trigger Campaign to Lists",
  description: "Send a triggered campaign to one or more lists.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "number", required: true },
    {
      key: "listIds",
      label: "List IDs",
      type: "string",
      required: true,
      hint: "Comma separated list ids.",
    },
    {
      key: "suppressionListIds",
      label: "Suppression List IDs",
      type: "string",
      hint: "Comma separated.",
    },
    {
      key: "dataFields",
      label: "Data Fields",
      type: "json",
      hint: "Fields merged into the template.",
    },
    {
      key: "allowRepeatMarketingSends",
      label: "Allow Repeat Marketing Sends",
      type: "boolean",
      hint: "Allow repeat marketing sends (default true).",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = int("campaignId", p.campaignId);
    const listIds = intList("listIds", p.listIds);
    const suppressionListIds = intList("suppressionListIds", p.suppressionListIds);
    const dataFields = jsonObject("dataFields", p.dataFields);
    const allowRepeatMarketingSends = bool(p.allowRepeatMarketingSends);
    if (campaignId === undefined) throw new Error("`campaignId` is required");
    if (listIds === undefined) throw new Error("`listIds` is required");
    ctx.log("info", "Iterable Trigger Campaign to Lists", { campaignId });
    const out = await call(ctx, "POST", "/campaigns/trigger", {
      body: compact({
        "campaignId": campaignId,
        "listIds": listIds,
        "suppressionListIds": suppressionListIds,
        "dataFields": dataFields,
        "allowRepeatMarketingSends": allowRepeatMarketingSends,
      }),
    });
    return out;
  },
};

export default action;
