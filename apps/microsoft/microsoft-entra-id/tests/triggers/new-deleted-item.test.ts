import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deleted-item.ts";

const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);
test("new-deleted-item seeds, emits new items, retries, and requests deletion order", async () => {
  const seed = ctx([item("a")]);
  const input = { params: { itemType: "user" }, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://graph.microsoft.com/v1.0/directory/deletedItems/microsoft.graph.user?%24top=100&%24orderby=deletedDateTime+desc&%24count=true",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
