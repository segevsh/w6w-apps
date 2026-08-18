import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, csv, query } from "../lib/client.ts";
import { CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.notification.listNotifications` — likes, replies, follows, mentions
 * and quotes aimed at the connected account.
 *
 * ## Reading does not mark as read
 *
 * `isRead` is a stored flag, and listing leaves it exactly as it was. Marking
 * requires `updateSeen`, which this action does **only** when asked — because a
 * workflow that reads notifications to build a report should not silently clear
 * somebody's badge, and one that processes them exactly once must.
 *
 * ## `seenAt` is a timestamp, so "mark as read" is a cut-off, not a selection
 *
 * `updateSeen` takes an instant and marks everything up to it. There is no way
 * to mark one notification. If new ones arrive between listing and marking,
 * marking with "now" clears those too — so this marks with the timestamp of the
 * **newest notification actually returned**, which is the only value that
 * cannot swallow something unseen.
 *
 * ## `reason` is the discriminator
 *
 * `like`, `repost`, `follow`, `mention`, `reply`, `quote`, `starterpack-joined`.
 * `reasonSubject` is the post it concerns — absent for a follow, which has no
 * subject.
 */
const action: ActionDefinition = {
  key: "notification-list",
  type: "read",
  resource: "notification",
  title: "List notifications",
  description:
    "Likes, replies, follows, mentions and quotes. Listing does NOT mark them read; marking is " +
    "opt-in and uses the newest returned item's timestamp so nothing unseen gets cleared.",
  params: [
    {
      key: "reasons",
      label: "Only These Kinds",
      type: "string",
      default: "",
      hint: "Comma-separated: `like`, `repost`, `follow`, `mention`, `reply`, `quote`.",
    },
    {
      key: "markSeen",
      label: "Mark As Read",
      type: "boolean",
      default: false,
      hint: "Marks everything up to the newest item RETURNED — not up to now, which would also " +
        "clear anything that arrived while this was running.",
    },
    {
      key: "unreadOnly",
      label: "Unread Only",
      type: "boolean",
      default: false,
      hint: "Filters the page after fetching, so a page can come back shorter than the limit.",
    },
    limitParam(50),
    CURSOR_PARAM,
  ],
  output: [
    { key: "notifications", type: "array", label: "Notifications, newest first" },
    { key: "count", type: "number", label: "Returned" },
    { key: "unreadCount", type: "number", label: "How many were unread" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
    { key: "markedSeenAt", type: "string", label: "The cut-off used, when marking" },
  ],

  async execute(input, ctx) {
    const client = new BlueskyClient(ctx);
    const p = input as Record<string, unknown>;

    const result = await client.call<{
      notifications?: Array<{ isRead?: boolean; indexedAt?: string; reason?: string }>;
      cursor?: string;
    }>("app.bsky.notification.listNotifications", {
      query: query({
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 50))),
        cursor: p.cursor,
      }),
    });

    let notifications = result?.notifications ?? [];
    const reasons = csv(p.reasons);
    if (reasons) {
      const wanted = new Set(reasons.map((r) => r.toLowerCase()));
      notifications = notifications.filter((n) =>
        wanted.has(String(n?.reason ?? "").toLowerCase())
      );
    }
    const unreadCount = notifications.filter((n) => n?.isRead !== true).length;
    if (p.unreadOnly === true) notifications = notifications.filter((n) => n?.isRead !== true);

    let markedSeenAt: string | undefined;
    if (p.markSeen === true && notifications.length > 0) {
      // The newest item actually returned — not `now`, which would also clear
      // anything that arrived while this was running.
      markedSeenAt = notifications
        .map((n) => String(n?.indexedAt ?? ""))
        .filter(Boolean)
        .sort()
        .pop();
      if (markedSeenAt) {
        await client.call("app.bsky.notification.updateSeen", {
          method: "POST",
          body: { seenAt: markedSeenAt },
        });
      }
    }

    ctx.log("info", "read Bluesky notifications", {
      count: notifications.length,
      unread: unreadCount,
      marked: Boolean(markedSeenAt),
    });

    return {
      notifications,
      count: notifications.length,
      unreadCount,
      cursor: result?.cursor,
      markedSeenAt,
    };
  },
};

export default action;
