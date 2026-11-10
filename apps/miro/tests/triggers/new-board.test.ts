import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-board.ts";
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) =>
  mockCtx([{ body: { data: items, total: items.length, size: items.length } }], { display: {} });
test("new-board seeds, emits boards, retries, and requests last-created order", async () => {
  const seed = ctx([item("a")]);
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.miro.com/v2/boards?sort=last_created&limit=50&offset=0",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
