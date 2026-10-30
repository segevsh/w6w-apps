import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactList from "../../actions/contact-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("contact-list: maps camelCase filters to Luma's snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await contactList.execute(
    { query: "ada", membershipStatus: "approved", paginationLimit: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/calendars/contacts/list");
  assertEquals(queryOf(calls[0].url), {
    query: "ada",
    membership_status: "approved",
    pagination_limit: "25",
  });
});
