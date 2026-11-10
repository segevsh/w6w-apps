import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-page.ts";
const item = (id: string) => ({ id, lastModifiedDateTime: id });
const ctx = (items: unknown[]) => mockCtx([{ body: { value: items } }]);
test("new-or-updated-page seeds, emits changed pages, retries, and requests the modified-first page feed", async () => {
  const seed = ctx([item("a")]);
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://graph.microsoft.com/v1.0/me/onenote/pages?%24top=100");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
test("new-or-updated-page emits an edited page (same id, new lastModifiedDateTime) exactly once", async () => {
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, ctx([{ id: "a", lastModifiedDateTime: "1" }]).ctx);
  const edited = { id: "a", lastModifiedDateTime: "2" };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([edited]).ctx);
  assertEquals(first.events, [edited]);
  const again = await trigger.poll!({ ...input, state: first.nextState }, ctx([edited]).ctx);
  assertEquals(again.events, []);
});
