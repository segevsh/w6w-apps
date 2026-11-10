import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-receipt.ts";
import { clock } from "../../lib/since.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const receipt = (id: string, updated: string) => ({ id, updated_at: updated });
const ctx = (receipts: unknown[]) => mockCtx([{ body: { receipts } }]);
const NOW = Date.parse("2026-11-09T12:00:00.000Z");
clock.now = () => NOW;

test("new-or-updated-receipt: seeds, emits new, retries idempotently, filters updated_at_min", async () => {
  const seed = ctx([receipt("a", "t1")]);
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
    path: "/v1.0/receipts",
    // cursor (NOW) - 120 s
    query: { updated_at_min: "2026-11-09T11:58:00.000Z", limit: "100" },
  });
  const page = [receipt("b", "t5"), receipt("a", "t1")];
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx(page).ctx);
  const retry = await trigger.poll!(later, ctx(page).ctx);
  assertEquals(first.events, [receipt("b", "t5")]);
  assertEquals(retry, first);
});

test("new-or-updated-receipt: an edited receipt (same id, newer updated_at) is emitted", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([receipt("a", "t1")]).ctx);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([receipt("a", "t2")]).ctx,
  );
  assertEquals(edited.events, [receipt("a", "t2")]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([receipt("a", "t1")]).ctx,
  );
  assertEquals(same.events, []);
});

test("new-or-updated-receipt: follows the vendor's cursor to the next page", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([receipt("a", "t1")]).ctx);
  const c = mockCtx([
    { body: { receipts: [receipt("b", "t2")], cursor: "next-1" } },
    { body: { receipts: [receipt("c", "t3")] } },
  ]);
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, c.ctx);
  assertEquals(res.events.length, 2);
  assertEquals(new URL(c.calls[1].url).searchParams.get("cursor"), "next-1");
});
