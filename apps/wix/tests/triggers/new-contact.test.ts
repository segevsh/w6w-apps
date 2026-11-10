import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";
const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (contacts: unknown[]) => mockCtx([{ body: { contacts } }]);
test("new-contact seeds, emits, retries, and calls sorted contacts", async () => {
  const seed = ctx([item("a")]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url:
      "https://www.wixapis.com/contacts/v4/contacts?paging.limit=100&paging.offset=0&sort.fieldName=createdDate&sort.order=DESC",
  });
  const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx);
  assertEquals(n.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx),
    n,
  );
});
