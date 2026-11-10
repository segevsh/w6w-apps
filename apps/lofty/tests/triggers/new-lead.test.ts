import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-lead.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const lead = (leadId: number) => ({ leadId, firstName: "x" });
const ctx = (ids: number[]) => mockCtx([{ body: { leads: ids.map(lead), get_metadata: {} } }]);

test("new-lead: seeds, emits only new leads, retries idempotently, sorts newest-created first", async () => {
  const seed = ctx([1]);
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
    path: "/v1.0/leads",
    query: { limit: "100", sort: "CreateTime", desc: "true" },
  });
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx([2, 1]).ctx);
  const retry = await trigger.poll!(later, ctx([2, 1]).ctx);
  assertEquals(first.events, [lead(2)]);
  assertEquals(retry, first);
});
