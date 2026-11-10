import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBaserowCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-row.ts";

const input = { params: { tableId: 7 }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockBaserowCtx([{ body: page(items) }]);
const item = (id: string) => ({ id });

test("new-row: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://baserow.example.com/api/database/rows/table/7/?user_field_names=false&order_by=-id&page=1&size=100",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
