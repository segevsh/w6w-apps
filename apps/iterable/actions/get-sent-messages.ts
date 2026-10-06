import type { ActionDefinition } from "@w6w/types";
import { bool, call, int, intList, oneOf, str } from "../lib/client.ts";

/**
 * `GET /api/users/getSentMessages` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-sent-messages",
  type: "read",
  resource: "message",
  title: "Get Messages Sent to a User",
  description:
    "Messages sent to a user (default 10, up to 1000). Rate limit 3 requests/second per project.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum messages (default 10, max 1000).",
    },
    {
      key: "campaignIds",
      label: "Campaign IDs",
      type: "string",
      hint: "Only messages from these campaigns (comma separated).",
    },
    { key: "startDateTime", label: "Start", type: "string", hint: "yyyy-MM-dd HH:mm:ss ZZ" },
    { key: "endDateTime", label: "End", type: "string", hint: "yyyy-MM-dd HH:mm:ss ZZ" },
    { key: "excludeBlastCampaigns", label: "Exclude Blast Campaigns", type: "boolean" },
    {
      key: "messageMedium",
      label: "Message Medium",
      type: "select",
      options: [{ "value": "Email", "label": "Email" }, { "value": "Push", "label": "Push" }, {
        "value": "InApp",
        "label": "InApp",
      }, { "value": "SMS", "label": "SMS" }],
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Sent messages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    const userId = str(p.userId);
    const limit = int("limit", p.limit);
    const campaignIds = intList("campaignIds", p.campaignIds);
    const startDateTime = str(p.startDateTime);
    const endDateTime = str(p.endDateTime);
    const excludeBlastCampaigns = bool(p.excludeBlastCampaigns);
    const messageMedium = str(p.messageMedium);
    oneOf(["email", "userId"], { "email": email, "userId": userId }, "at-least-one");
    ctx.log("info", "Iterable Get Messages Sent to a User");
    const out = await call(ctx, "GET", "/users/getSentMessages", {
      query: {
        "email": email,
        "userId": userId,
        "limit": limit,
        "campaignIds": campaignIds,
        "startDateTime": startDateTime,
        "endDateTime": endDateTime,
        "excludeBlastCampaigns": excludeBlastCampaigns,
        "messageMedium": messageMedium,
      },
    });
    return out;
  },
};

export default action;
