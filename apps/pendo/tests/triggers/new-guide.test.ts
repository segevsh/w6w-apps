import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-guide.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string, name: string) => ({ id, name });
const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: items }]);

test("new-guide: seeds, emits only added rows (not edits), retries idempotently, lists the collection", async () => {
  const seed = ctx([row("a", "Alpha")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://app.pendo.io/api/v1/guide");

  // "b" is added and "a" is edited in place: only the added row is emitted.
  const page = [row("a", "Alpha (renamed)"), row("b", "Beta")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [{ change: "added", key: "b", values: row("b", "Beta") }]);
  assertEquals(retry, first);
});
