import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";
const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (leads: unknown[]) => mockCtx([{ body: { leads } }]);
test("new-lead seeds, emits, retries, and requests descending leads", async () => {
  const seed = ctx([item("a")]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://app.whatconverts.com/api/v1/leads?leads_per_page=100&page_number=1&order=desc",
  });
  const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx);
  assertEquals(n.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx),
    n,
  );
});
