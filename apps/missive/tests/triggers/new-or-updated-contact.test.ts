import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
const item = (id: string) => ({ id, modified_at: id });
const ctx = (items: unknown[]) => mockCtx([{ body: { contacts: items } }]);
test("new-or-updated-contact seeds, emits contacts, retries, and requests last-modified order", async () => {
  const seed = ctx([item("a")]);
  const input = { params: { contactBook: "book" }, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://public.missiveapp.com/v1/contacts?contact_book=book&order=last_modified&limit=200&offset=0",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
