import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-follower.ts";

// Most-recent-follower-first feed (get-channel-followers), broadcaster id is a trigger param.
const input = { params: { broadcasterId: "141981764" }, subscriptionId: "sub-1" };
const item = (id: string) => ({ user_id: id, followed_at: "2026-01-01T00:00:00Z" });
const ctx = (items: unknown[]) => mockCtx([{ body: { total: 9, data: items, pagination: {} } }]);

test("new-follower: seeds without emitting, then emits exactly the new item (idempotent)", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("u1")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const page = [item("u2"), item("u1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("u2")]);
  assertEquals(retry, first);
});

test("new-follower: requests the channel's followers with the wrapped action's endpoint", async () => {
  const m = ctx([item("u1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.twitch.tv/helix/channels/followers?broadcaster_id=141981764&first=100",
  );
});
