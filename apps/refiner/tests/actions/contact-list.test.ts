import { assert, assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: maps filters and the cursor to snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{
    body: listPage([{ uuid: "c1" }], { next_page_cursor: "abc" }),
  }]);
  const out = await contactList.execute(
    {
      orderBy: "last_seen_at",
      pageLength: 100,
      pageCursor: "cur",
      formUuid: "f1",
      segmentUuid: "s1",
      search: "jane",
    },
    ctx,
  ) as { pagination: { next_page_cursor: string } };
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), {
    order_by: "last_seen_at",
    page_length: "100",
    page_cursor: "cur",
    form_uuid: "f1",
    segment_uuid: "s1",
    search: "jane",
  });
  assertEquals(out.pagination.next_page_cursor, "abc");
});

Deno.test("contact-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(contactList.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
