import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/notification-list.ts";

const page = ok({
  notifications: [
    { reason: "like", isRead: false, indexedAt: "2026-08-18T10:00:00Z" },
    { reason: "follow", isRead: true, indexedAt: "2026-08-18T09:00:00Z" },
    { reason: "reply", isRead: false, indexedAt: "2026-08-18T08:00:00Z" },
  ],
  cursor: "c1",
});

Deno.test("notification-list: reads without marking anything", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  const result = await action.execute!({}, ctx) as { count: number; unreadCount: number };
  assertEquals(calls.length, 1, "no updateSeen call");
  assertEquals(result.count, 3);
  assertEquals(result.unreadCount, 2);
});

/**
 * Marking with `now` would also clear anything that arrived while this ran.
 * The newest item actually returned is the only value that cannot.
 */
Deno.test("notification-list: marking uses the newest item RETURNED, not now", async () => {
  const { ctx, calls } = mockCtx([page, ok({})], { display });
  const result = await action.execute!({ markSeen: true }, ctx) as { markedSeenAt: string };
  assertEquals(calls[1].url, "https://bsky.social/xrpc/app.bsky.notification.updateSeen");
  assertEquals(JSON.parse(calls[1].body!), { seenAt: "2026-08-18T10:00:00Z" });
  assertEquals(result.markedSeenAt, "2026-08-18T10:00:00Z");
});

Deno.test("notification-list: nothing to mark makes no call", async () => {
  const { ctx, calls } = mockCtx([ok({ notifications: [] })], { display });
  const result = await action.execute!({ markSeen: true }, ctx) as { markedSeenAt?: string };
  assertEquals(calls.length, 1);
  assertEquals(result.markedSeenAt, undefined);
});

Deno.test("notification-list: kinds can be filtered", async () => {
  const { ctx } = mockCtx([page], { display });
  const result = await action.execute!({ reasons: "like, reply" }, ctx) as {
    count: number;
    notifications: Array<{ reason: string }>;
  };
  assertEquals(result.count, 2);
  assertEquals(result.notifications.map((n) => n.reason), ["like", "reply"]);
});

/** Filtering happens after fetching, so a page can be shorter than the limit. */
Deno.test("notification-list: unread-only filters the page and reports the full unread count", async () => {
  const { ctx } = mockCtx([page], { display });
  const result = await action.execute!({ unreadOnly: true }, ctx) as {
    count: number;
    unreadCount: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.unreadCount, 2);
});

Deno.test("notification-list: filtering and marking compose — the mark follows the filter", async () => {
  const { ctx, calls } = mockCtx([page, ok({})], { display });
  await action.execute!({ reasons: "reply", markSeen: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { seenAt: "2026-08-18T08:00:00Z" });
});

Deno.test("notification-list: the limit is clamped and the cursor passed", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  await action.execute!({ limit: 999, cursor: "c0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("cursor"), "c0");
});

Deno.test("notification-list: logs counts, never the notifications", async () => {
  const { ctx, logs } = mockCtx([page], { display });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 3, unread: 2, marked: false });
});

Deno.test("notification-list: says that reading does not mark", () => {
  assert(/does NOT mark them read/.test(action.description!), action.description);
});
