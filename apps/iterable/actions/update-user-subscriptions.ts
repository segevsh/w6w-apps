import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, intList, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/users/updateSubscriptions` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "update-user-subscriptions",
  type: "perform",
  resource: "subscription",
  title: "Update User Subscriptions",
  description:
    "Set a user's list and message-type subscriptions. OVERWRITES (does not merge) each list field you supply.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
    {
      key: "emailListIds",
      label: "Email List IDs",
      type: "string",
      hint: "Lists the user is subscribed to (comma separated).",
    },
    {
      key: "unsubscribedChannelIds",
      label: "Unsubscribed Channel IDs",
      type: "string",
      hint: "Comma separated.",
    },
    {
      key: "unsubscribedMessageTypeIds",
      label: "Unsubscribed Message Type IDs",
      type: "string",
      hint: "Comma separated.",
    },
    {
      key: "subscribedMessageTypeIds",
      label: "Subscribed Message Type IDs",
      type: "string",
      hint: "Needs the opt-in message types feature enabled by Iterable. Comma separated.",
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "number",
      hint: "Attribute unsubscribes to a campaign.",
    },
    { key: "templateId", label: "Template ID", type: "number" },
    {
      key: "validateChannelAlignment",
      label: "Validate Channel Alignment",
      type: "boolean",
      hint: "Reject message types that do not belong to the given channels.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    const userId = str(p.userId);
    const emailListIds = intList("emailListIds", p.emailListIds);
    const unsubscribedChannelIds = intList("unsubscribedChannelIds", p.unsubscribedChannelIds);
    const unsubscribedMessageTypeIds = intList(
      "unsubscribedMessageTypeIds",
      p.unsubscribedMessageTypeIds,
    );
    const subscribedMessageTypeIds = intList(
      "subscribedMessageTypeIds",
      p.subscribedMessageTypeIds,
    );
    const campaignId = int("campaignId", p.campaignId);
    const templateId = int("templateId", p.templateId);
    const validateChannelAlignment = bool(p.validateChannelAlignment);
    oneOf(["email", "userId"], { "email": email, "userId": userId }, "at-least-one");
    ctx.log("info", "Iterable Update User Subscriptions");
    const out = await call(ctx, "POST", "/users/updateSubscriptions", {
      body: compact({
        "email": email,
        "userId": userId,
        "emailListIds": emailListIds,
        "unsubscribedChannelIds": unsubscribedChannelIds,
        "unsubscribedMessageTypeIds": unsubscribedMessageTypeIds,
        "subscribedMessageTypeIds": subscribedMessageTypeIds,
        "campaignId": campaignId,
        "templateId": templateId,
        "validateChannelAlignment": validateChannelAlignment,
      }),
    });
    return out;
  },
};

export default action;
