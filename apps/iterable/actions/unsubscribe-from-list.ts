import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, jsonArray } from "../lib/client.ts";

/**
 * `POST /api/lists/unsubscribe` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "unsubscribe-from-list",
  type: "perform",
  resource: "list",
  title: "Unsubscribe Users from List",
  description: "Remove users from a list.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
    {
      key: "subscribers",
      label: "Subscribers",
      type: "json",
      required: true,
      hint: 'JSON array of {"email"|"userId"} objects.',
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "number",
      hint: "Attribute the unsubscribe to a campaign.",
    },
    {
      key: "channelUnsubscribe",
      label: "Channel Unsubscribe",
      type: "boolean",
      hint: "Also unsubscribe from the list's channel (a global unsubscribe).",
    },
  ],
  output: [
    { key: "successCount", type: "number", label: "Users removed" },
    { key: "failCount", type: "number", label: "Users that failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = int("listId", p.listId);
    const subscribers = jsonArray("subscribers", p.subscribers);
    const campaignId = int("campaignId", p.campaignId);
    const channelUnsubscribe = bool(p.channelUnsubscribe);
    if (listId === undefined) throw new Error("`listId` is required");
    if (subscribers === undefined) throw new Error("`subscribers` is required");
    ctx.log("info", "Iterable Unsubscribe Users from List", { listId });
    const out = await call(ctx, "POST", "/lists/unsubscribe", {
      body: compact({
        "listId": listId,
        "subscribers": subscribers,
        "campaignId": campaignId,
        "channelUnsubscribe": channelUnsubscribe,
      }),
    });
    return out;
  },
};

export default action;
