import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, jsonObject, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/push/target` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "send-push",
  type: "perform",
  resource: "message",
  title: "Send Push Notification",
  description:
    "Send a push notification to one user via a triggered campaign. Give a recipient email or userId.",
  idempotent: false,
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "number",
      required: true,
      hint: "A triggered/API campaign id.",
    },
    { key: "recipientEmail", label: "Recipient Email", type: "string" },
    { key: "recipientUserId", label: "Recipient User ID", type: "string" },
    {
      key: "dataFields",
      label: "Data Fields",
      type: "json",
      hint: "Fields merged into the template (override profile fields).",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Passed back via webhooks; not used for rendering.",
    },
    {
      key: "sendAt",
      label: "Send At",
      type: "string",
      hint: "UTC `YYYY-MM-DD HH:MM:SS`, up to 365 days ahead; in the past sends now.",
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
    const recipientEmail = str(p.recipientEmail);
    const recipientUserId = str(p.recipientUserId);
    const dataFields = jsonObject("dataFields", p.dataFields);
    const metadata = jsonObject("metadata", p.metadata);
    const sendAt = str(p.sendAt);
    const allowRepeatMarketingSends = bool(p.allowRepeatMarketingSends);
    oneOf(["recipientEmail", "recipientUserId"], {
      "recipientEmail": recipientEmail,
      "recipientUserId": recipientUserId,
    }, "at-least-one");
    if (campaignId === undefined) throw new Error("`campaignId` is required");
    ctx.log("info", "Iterable Send Push Notification", { campaignId });
    const out = await call(ctx, "POST", "/push/target", {
      body: compact({
        "campaignId": campaignId,
        "recipientEmail": recipientEmail,
        "recipientUserId": recipientUserId,
        "dataFields": dataFields,
        "metadata": metadata,
        "sendAt": sendAt,
        "allowRepeatMarketingSends": allowRepeatMarketingSends,
      }),
    });
    return out;
  },
};

export default action;
