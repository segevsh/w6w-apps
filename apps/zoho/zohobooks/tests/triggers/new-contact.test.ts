import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const response = (contacts: unknown[], sortOrder = "D") => ({
  body: { code: 0, contacts, page_context: { sort_column: "created_time", sort_order: sortOrder } },
});
const run = (state: unknown, contacts: unknown[], sortOrder?: string) =>
  trigger.poll!(
    { params: {}, subscriptionId: "sub", state },
    mockBooksCtx([response(contacts, sortOrder)]).ctx,
  );

test("new-contact seeds, emits additions, retries, and requests the documented sort column", async () => {
  const seedCtx = mockBooksCtx([
    response([{ contact_id: "a", created_time: "2026-11-01T10:00:00+0530" }]),
  ]);
  const seeded = await trigger.poll!({ params: {}, subscriptionId: "sub", state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const url = new URL(seedCtx.calls[0].url);
  assertEquals(
    url.pathname + url.search,
    "/books/v3/contacts?organization_id=10234695&page=1&per_page=100&sort_column=created_time",
  );
  const page = [{ contact_id: "b", created_time: "2026-11-09T10:00:00+0530" }, {
    contact_id: "a",
    created_time: "2026-11-01T10:00:00+0530",
  }];
  const first = await run(seeded.nextState, page);
  const retry = await run(seeded.nextState, page);
  assertEquals(first.events, [{ contact_id: "b", created_time: "2026-11-09T10:00:00+0530" }]);
  assertEquals(retry, first);
});

test("new-contact does not re-emit an edited old contact (sorted by created_time)", async () => {
  const seeded = await run({}, [{ contact_id: "a", created_time: "2026-11-01T10:00:00+0530" }]);
  // an edit changes last_modified_time only; the created-ordered page is unchanged
  const edited = await run(seeded.nextState, [{
    contact_id: "a",
    created_time: "2026-11-01T10:00:00+0530",
    last_modified_time: "2026-11-09T12:00:00+0530",
  }]);
  assertEquals(edited.events, []);
});

test("new-contact refuses a response the vendor reports as ascending", async () => {
  let message = "";
  try {
    await run({}, [{ contact_id: "a" }], "A");
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("non-descending"));
});
