import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const response = (contacts: unknown[], sortOrder = "D") => ({
  body: {
    code: 0,
    contacts,
    page_context: { sort_column: "last_modified_time", sort_order: sortOrder },
  },
});
const run = (state: unknown, contacts: unknown[], sortOrder?: string) =>
  trigger.poll!(
    { params: {}, subscriptionId: "sub", state },
    mockBooksCtx([response(contacts, sortOrder)]).ctx,
  );

test("new-or-updated-contact seeds, emits additions, retries, and requests the documented sort column", async () => {
  const seedCtx = mockBooksCtx([
    response([{ contact_id: "a", last_modified_time: "2026-11-01T10:00:00+0530" }]),
  ]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const url = new URL(seedCtx.calls[0].url);
  assertEquals(
    url.pathname + url.search,
    "/books/v3/contacts?organization_id=10234695&page=1&per_page=100&sort_column=last_modified_time",
  );
  const page = [{ contact_id: "b", last_modified_time: "2026-11-09T10:00:00+0530" }, {
    contact_id: "a",
    last_modified_time: "2026-11-01T10:00:00+0530",
  }];
  const first = await run(seeded.nextState, page);
  const retry = await run(seeded.nextState, page);
  assertEquals(first.events, [{ contact_id: "b", last_modified_time: "2026-11-09T10:00:00+0530" }]);
  assertEquals(retry, first);
});

test("new-or-updated-contact emits an edited contact again", async () => {
  const seeded = await run({}, [{
    contact_id: "a",
    last_modified_time: "2026-11-01T10:00:00+0530",
  }]);
  const edited = await run(seeded.nextState, [{
    contact_id: "a",
    last_modified_time: "2026-11-09T12:00:00+0530",
  }]);
  assertEquals(edited.events, [{
    contact_id: "a",
    last_modified_time: "2026-11-09T12:00:00+0530",
  }]);
});
