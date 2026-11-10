import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMocoCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";
const item = (id: number) => ({ id, updated_at: String(id) });
const ctx = (items: unknown[]) =>
  mockMocoCtx([{
    body: items,
    headers: { "x-page": "1", "x-per-page": "100", "x-total": String(items.length) },
  }]);
test("new-or-updated-contact seeds, emits contacts, retries, and requests updated-after", async () => {
  const seed = ctx([item(1)]);
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://acme.mocoapp.com/api/v1/contacts/people?page=1&per_page=100&updated_after=1970-01-01T00%3A00%3A00Z",
  );
  const page = [item(2), item(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});
