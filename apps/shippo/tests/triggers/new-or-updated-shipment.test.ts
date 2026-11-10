import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-shipment.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (object_id: string) => ({ object_id, updated_at: "2026-11-09T12:00:00Z" });
const page = (results: unknown[]) => ({ results });

test("new-or-updated-shipment seeds, emits, retries, and requests the literal recent page", async () => {
  const seed = mockCtx([{ body: page([item("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.goshippo.com/shipments?results=100&page=1");
  const next = page([item("b"), item("a")]);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
