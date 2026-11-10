import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-constituent.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const response = (ids: string[]) => ({ items: ids.map((id) => ({ id })) });
const ctx = (ids: string[]) => mockCtx([{ body: response(ids) }]);

test("new-or-updated-constituent: seeds, emits only new or updated items, retries idempotently, and requests its feed", async () => {
  const seed = ctx(["a"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/api/v1/constituents/search.json",
    query: { sort: "date_updated!", limit: "100", offset: "0" },
  });
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});

test("new-or-updated-constituent: an edited constituent (same id, newer date_updated) is emitted", async () => {
  const row = (date: string) => ({ id: "a", date_updated: date });
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { items: [row("t1")] } }]).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { items: [row("t2")] } }]).ctx,
  );
  assertEquals(edited.events, [row("t2")]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { items: [row("t1")] } }]).ctx,
  );
  assertEquals(same.events, []);
});
