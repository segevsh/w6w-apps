import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

test("new-contact seeds, emits additions, retries, and requests the documented newest-first feed", async () => {
  const response = (contacts: unknown[]) => ({ body: { code: 0, contacts } });
  const seedCtx = mockBooksCtx([response([{ contact_id: "a" }])]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const url = new URL(seedCtx.calls[0].url);
  assertEquals(
    url.pathname + url.search,
    "/books/v3/contacts?organization_id=10234695&page=1&per_page=100&sort_column=last_modified_time&sort_order=descending",
  );
  const first = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockBooksCtx([response([{ contact_id: "b" }, { contact_id: "a" }])]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, subscriptionId: "sub", state: seeded.nextState },
    mockBooksCtx([response([{ contact_id: "b" }, { contact_id: "a" }])]).ctx,
  );
  assertEquals(first.events, [{ contact_id: "b" }]);
  assertEquals(retry, first);
});
