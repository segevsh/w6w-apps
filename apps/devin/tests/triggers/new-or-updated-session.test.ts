import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-session.ts";
import { clock } from "../../lib/triggers.ts";

// 2026-11-09T12:00:00Z = 1762689600 s
clock.now = () => 1762689600 * 1000;

const input = { params: {}, subscriptionId: "sub-1" };
const session = (session_id: string, updated_at = 100) => ({ session_id, updated_at });
const ctx = (items: unknown[], more = false) =>
  mockCtx([{
    body: { items, end_cursor: more ? "c2" : null, has_next_page: more, total: items.length },
  }]);

test("new-or-updated-session: seeds without flooding and sends the updated_after filter", async () => {
  const seed = ctx([session("devin-a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.devin.ai/v3/organizations/org-test0000000000/sessions?first=100&updated_after=1762689480",
  );
});

test("new-or-updated-session: the next check filters from the stored cursor minus the overlap", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([session("devin-a")]).ctx);
  clock.now = () => (1762689600 + 600) * 1000;
  const next = ctx([]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  clock.now = () => 1762689600 * 1000;
  assertEquals(
    next.calls[0].url,
    "https://api.devin.ai/v3/organizations/org-test0000000000/sessions?first=100&updated_after=1762689480",
  );
});

test("new-or-updated-session: emits only the new session", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([session("devin-a")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([session("devin-b"), session("devin-a")]).ctx,
  );
  assertEquals(result.events, [session("devin-b")]);
});

test("new-or-updated-session: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([session("devin-a")]).ctx);
  const page = [session("devin-b"), session("devin-a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-or-updated-session: a changed session is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([session("devin-a", 100)]).ctx);
  const changed = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([session("devin-a", 200)]).ctx,
  );
  assertEquals(changed.events, [session("devin-a", 200)]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([session("devin-a", 100)]).ctx,
  );
  assertEquals(same.events, []);
});
