import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInventoryCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-item.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, modified = "2026-11-01") => ({
  item_id: id,
  name: `Item ${id}`,
  created_time: "2026-11-01",
  last_modified_time: modified,
});
const page = (...rows: unknown[]) =>
  mockInventoryCtx([{ body: { code: 0, message: "success", items: rows } }]);

test("new-or-updated-item: the first check seeds without events and sends the documented request", async () => {
  const seed = page(item("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://www.zohoapis.com/inventory/v1/items?organization_id=10234695&per_page=100&sort_column=last_modified_time&sort_order=D",
  );
});

test("new-or-updated-item: emits only the new item, and a retry from the same state is identical", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const rows = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
  const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
  assertEquals(again.events, []);
});

test("new-or-updated-item: an edited item is a new event", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const edited = item("a", "2026-11-09");
  const out = await trigger.poll!({ ...input, state: seeded.nextState }, page(edited).ctx);
  assertEquals(out.events, [edited]);
});
