import type { ActionDefinition } from "@w6w/types";
import { call, compact, int, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/push/cancel` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "cancel-push",
  type: "perform",
  resource: "message",
  title: "Cancel Scheduled Push Notification",
  description:
    "Cancel a scheduled push notification: give `scheduledMessageId`, or `campaignId` plus an email or userId.",
  idempotent: true,
  params: [
    { key: "scheduledMessageId", label: "Scheduled Message ID", type: "number" },
    { key: "campaignId", label: "Campaign ID", type: "number" },
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const scheduledMessageId = int("scheduledMessageId", p.scheduledMessageId);
    const campaignId = int("campaignId", p.campaignId);
    const email = str(p.email);
    const userId = str(p.userId);
    oneOf(["scheduledMessageId", "campaignId"], {
      "scheduledMessageId": scheduledMessageId,
      "campaignId": campaignId,
    }, "at-least-one");
    ctx.log("info", "Iterable Cancel Scheduled Push Notification");
    const out = await call(ctx, "POST", "/push/cancel", {
      body: compact({
        "scheduledMessageId": scheduledMessageId,
        "campaignId": campaignId,
        "email": email,
        "userId": userId,
      }),
    });
    return out;
  },
};

export default action;
