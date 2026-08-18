import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";
import { LIST_PARAMS, PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page}/subscribers` — who gets told.
 *
 * Worth reading before turning on notifications, because the number is the
 * blast radius: `deliver_notifications` on an incident update emails, texts or
 * webhooks every one of these people, immediately and irrevocably.
 *
 * Subscribers come in several types — email, SMS, webhook, Slack — and can be
 * subscribed to the *whole page* or to **specific components**, which is why a
 * count alone understates how targeted a notification is. `state` distinguishes
 * `active` from `unconfirmed` and `quarantined`; only active ones are
 * delivered to.
 */
const action: ActionDefinition = {
  key: "subscriber-list",
  type: "read",
  resource: "subscriber",
  title: "List subscribers",
  description:
    "Who receives notifications, and how. Worth reading before enabling delivery — this count " +
    "is the blast radius of a notified incident update.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
        { value: "webhook", label: "Webhook" },
        { value: "slack", label: "Slack" },
      ],
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active — actually delivered to" },
        { value: "unconfirmed", label: "Unconfirmed" },
        { value: "quarantined", label: "Quarantined" },
        { value: "", label: "All" },
      ],
    },
    PAGE_PARAM,
    ...LIST_PARAMS,
  ],
  output: [
    { key: "subscribers", type: "array", label: "Subscribers" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const subscribers = await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/subscribers`,
      {
        query: {
          type: String(p.type ?? "") || undefined,
          // The host applies a param `default`; a bare execute() call does not,
          // and "active" is the meaningful default. An explicit "" still means
          // every state.
          state: (p.state === undefined ? "active" : String(p.state)) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
    return { subscribers, count: subscribers.length };
  },
};

export default action;
