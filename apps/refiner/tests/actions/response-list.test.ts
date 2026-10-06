import { assert, assertEquals, assertRejects } from "@std/assert";
import responseList from "../../actions/response-list.ts";
import { errorBody, listPage, mockCtx } from "../_helpers.ts";

Deno.test("response-list: sends scalar filters, arrays and bracketed object filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ uuid: "r1" }], { next_page_cursor: "n" }) }]);
  const out = await responseList.execute(
    {
      formUuid: "f1",
      formUuids: "f2, f3",
      segmentUuid: "s1",
      tagUuid: "t1",
      dateRangeStart: "2026-01-01",
      dateRangeEnd: "2026-02-01",
      include: "all",
      search: "jane",
      responseData: { nps: 9 },
      contactData: '{"country":"France"}',
      accountData: { plan: "pro" },
      withAttributes: true,
      pageLength: 200,
      pageCursor: "cur",
    },
    ctx,
  ) as { pagination: { next_page_cursor: string } };
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v1/responses");
  assertEquals(u.searchParams.get("form_uuid"), "f1");
  assertEquals(u.searchParams.getAll("form_uuids[]"), ["f2", "f3"]);
  assertEquals(u.searchParams.get("response_data[nps]"), "9");
  assertEquals(u.searchParams.get("contact_data[country]"), "France");
  assertEquals(u.searchParams.get("account_data[plan]"), "pro");
  assertEquals(u.searchParams.get("date_range_start"), "2026-01-01");
  assertEquals(u.searchParams.get("date_range_end"), "2026-02-01");
  assertEquals(u.searchParams.get("include"), "all");
  assertEquals(u.searchParams.get("with_attributes"), "1");
  assertEquals(u.searchParams.get("page_length"), "200");
  assertEquals(u.searchParams.get("page_cursor"), "cur");
  assertEquals(u.searchParams.get("segment_uuid"), "s1");
  assertEquals(u.searchParams.get("tag_uuid"), "t1");
  assertEquals(u.searchParams.get("search"), "jane");
  assertEquals(out.pagination.next_page_cursor, "n");
});

Deno.test("response-list: no filters means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await responseList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("response-list: a malformed filter object fails before any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(responseList.execute({ responseData: "{bad" }, ctx)),
    Error,
    "responseData is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("response-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(responseList.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
