import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-model.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string, owned_by: string) => ({ id, owned_by });
const ctx = (items: unknown[]) => mockCtx([{ body: { object: "list", data: items } }]);

test("new-model: seeds, emits only added rows (not edits), retries idempotently, lists the collection", async () => {
  const seed = ctx([row("a", "Alpha")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.openai.com/v1/models");

  // "b" is added and "a" is edited in place: only the added row is emitted.
  const page = [row("a", "Alpha (renamed)"), row("b", "Beta")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [{ change: "added", key: "b", values: row("b", "Beta") }]);
  assertEquals(retry, first);
});
