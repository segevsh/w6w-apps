import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";
const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (rows: unknown[]) => mockCtx([{ body: { error: null, metadata: {}, data: rows } }]);
test("new-contact seeds, emits, retries, and requests newest first", async () => {
  const seed = ctx([item("a")]);
  const state = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(state.events, []);
  assertEquals((state.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://integration.upsales.com/api/v2/contacts?limit=100&offset=0&sort=id%3Adesc",
  });
  const next = await trigger.poll!(
    { ...input, state: state.nextState },
    ctx([item("b"), item("a")]).ctx,
  );
  assertEquals(next.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: state.nextState }, ctx([item("b"), item("a")]).ctx),
    next,
  );
});
