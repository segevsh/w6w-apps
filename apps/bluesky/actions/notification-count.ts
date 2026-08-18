import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient } from "../lib/client.ts";

/**
 * `app.bsky.notification.getUnreadCount` — the badge number.
 *
 * One cheap call, which makes it the right thing to poll on a schedule before
 * deciding whether `notification-list` is worth making. Polling the list itself
 * to find out whether there is anything new is the expensive way to ask a
 * question with a one-integer answer.
 *
 * The number counts everything unread, of every kind. It cannot be filtered —
 * "how many unread mentions" needs the list.
 */
const action: ActionDefinition = {
  key: "notification-count",
  type: "read",
  resource: "notification",
  title: "Count unread notifications",
  description:
    "The unread badge number — one cheap call, so it is what a schedule should poll before " +
    "deciding whether to fetch the list. It cannot be filtered by kind.",
  params: [],
  output: [
    { key: "count", type: "number", label: "Unread notifications, all kinds" },
    { key: "hasUnread", type: "boolean", label: "Whether there are any" },
  ],

  async execute(_input, ctx) {
    const result = await new BlueskyClient(ctx).call<{ count?: number }>(
      "app.bsky.notification.getUnreadCount",
    );
    const count = Number(result?.count ?? 0);
    return { count, hasUnread: count > 0 };
  },
};

export default action;
