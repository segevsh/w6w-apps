import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";

const conn = { display: { environment: "sandbox" } };
const input = { params: { accessToken: "test-access-token" }, subscriptionId: "sub-1" };
const tx = (id: string) => ({ transaction_id: id, amount: 1 });
const sync = (
  added: unknown[],
  next: string,
  hasMore = false,
  extra: Record<string, unknown> = {},
) => ({
  status: 200,
  body: { added, modified: [], removed: [], next_cursor: next, has_more: hasMore, ...extra },
});
const bodyOf = (c: { body: string | null }) => JSON.parse(c.body!);

test("new-transaction: seeds by walking the history to its cursor, emitting nothing", async () => {
  const m = mockCtx([sync([tx("h1")], "c1", true), sync([tx("h2")], "c2")], conn);
  const r = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(r.events, []);
  assertEquals(r.nextState, { v: 1, kind: "token", seeded: true, token: "c2" });
  assertEquals(m.calls.length, 2);
  assertEquals(new URL(m.calls[0].url).pathname, "/transactions/sync");
  assertEquals(bodyOf(m.calls[0]), { access_token: "test-access-token", count: 500 });
  assertEquals(bodyOf(m.calls[1]).cursor, "c1");
});

test("new-transaction: after the seed, emits the added transactions and advances the cursor", async () => {
  const m = mockCtx([sync([tx("n1"), tx("n2")], "c3", false, { modified: [tx("m1")] })], conn);
  const state = { v: 1, kind: "token", seeded: true, token: "c2" };
  const r = await trigger.poll!({ ...input, state }, m.ctx);
  assertEquals(r.events, [tx("n1"), tx("n2")]);
  assertEquals(r.nextState, { v: 1, kind: "token", seeded: true, token: "c3" });
  assertEquals(m.calls.length, 1);
  assertEquals(new URL(m.calls[0].url).pathname, "/transactions/sync");
  assertEquals(bodyOf(m.calls[0]), { access_token: "test-access-token", cursor: "c2", count: 100 });
});

test("new-transaction: the same state and responses give the same result (idempotent retry)", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "c2" };
  const run = () => trigger.poll!({ ...input, state }, mockCtx([sync([tx("n1")], "c3")], conn).ctx);
  assertEquals(await run(), await run());
});

test("new-transaction: a check with nothing new keeps the cursor and emits nothing", async () => {
  const state = { v: 1, kind: "token", seeded: true, token: "c2" };
  const r = await trigger.poll!({ ...input, state }, mockCtx([sync([], "c2")], conn).ctx);
  assertEquals(r.events, []);
  assertEquals(r.nextState, state);
});

test("new-transaction: an Item whose transactions are not ready yet fails the seed instead of seeding an empty cursor", async () => {
  await assertRejects(() =>
    trigger.poll!({ ...input, state: {} }, mockCtx([sync([], "")], conn).ctx)
  );
});
