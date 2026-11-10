import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-conversation.ts";
import { clock } from "../../lib/triggers.ts";

clock.now = () => Date.parse("2026-11-09T12:00:00Z");

const input = { params: {}, subscriptionId: "sub-1" };
// Stamped after the seed (clock 12:00), as a real post-seed activity would be (brief 9.9).
const U = Date.parse("2026-11-09T12:00:30Z");
const conv = (session_id: string, updated_at = U) => ({ session_id, updated_at });
const ctx = (items: unknown[]) => mockCtx([{ body: { error: false, data: items } }], "site_1");

test("new-or-updated-conversation: seeds without flooding and sends the since filter", async () => {
  const seed = ctx([conv("s1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.crisp.chat/v1/website/site_1/conversations/1?per_page=50&filter_date_start=2026-11-09T11%3A58%3A00.000Z",
  );
});

test("new-or-updated-conversation: the next check filters from cursor minus overlap", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  clock.now = () => Date.parse("2026-11-09T12:10:00Z");
  const next = ctx([conv("s2")]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  clock.now = () => Date.parse("2026-11-09T12:00:00Z");
  assertEquals(
    next.calls[0].url,
    "https://api.crisp.chat/v1/website/site_1/conversations/1?per_page=50&filter_date_start=2026-11-09T11%3A58%3A00.000Z",
  );
});

test("new-or-updated-conversation: emits only the new conversation", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([conv("s2"), conv("s1")]).ctx,
  );
  assertEquals(result.events, [conv("s2")]);
});

test("new-or-updated-conversation: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  const page = [conv("s2"), conv("s1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-or-updated-conversation: new activity on a seen conversation is an event", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1", U)]).ctx);
  const active = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([conv("s1", U + 1000)]).ctx,
  );
  assertEquals(active.events, [conv("s1", U + 1000)]);
  const quiet = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([conv("s1", U)]).ctx,
  );
  assertEquals(quiet.events, []);
});
