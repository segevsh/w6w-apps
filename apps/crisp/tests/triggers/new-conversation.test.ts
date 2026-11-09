import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-conversation.ts";
import { clock } from "../../lib/triggers.ts";

clock.now = () => Date.parse("2026-11-09T12:00:00Z");

const input = { params: {}, subscriptionId: "sub-1" };
const T0 = Date.parse("2026-11-09T11:59:00Z");
const conv = (session_id: string, updated_at = T0, created_at = T0) => ({
  session_id,
  created_at,
  updated_at,
});
const ctx = (items: unknown[]) => mockCtx([{ body: { error: false, data: items } }], "site_1");

test("new-conversation: seeds without flooding and sends the since filter", async () => {
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

test("new-conversation: the next check filters from cursor minus overlap", async () => {
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

test("new-conversation: emits only the new conversation", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([conv("s2"), conv("s1")]).ctx,
  );
  assertEquals(result.events, [conv("s2")]);
});

test("new-conversation: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  const page = [conv("s2"), conv("s1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-conversation: activity on an older conversation is not a new conversation", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([conv("s1")]).ctx);
  const old = conv("s9", T0 + 1000, Date.parse("2026-01-01T00:00:00Z"));
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([old]).ctx);
  assertEquals(result.events, []);
});
