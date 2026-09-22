import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-all.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/list/GetAll";

Deno.test("list-get-all: POSTs paging in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ limit: 100, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 100 });
});

Deno.test("list-get-all: the type and campaign filters ride in the same body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({
    listType: "USER_LIST",
    campaignIds: [5, 6],
    keyword: "q3",
    limit: 50,
    offset: 10,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    offset: 10,
    limit: 50,
    keyword: "q3",
    listType: "USER_LIST",
    campaignIds: [5, 6],
  });
});

/** A comma-separated field and a real array are both accepted, and both parse. */
Deno.test("list-get-all: campaignIds accepts a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ campaignIds: "5, 6 ", limit: 100, offset: 0 }, ctx);
  assertEquals(jsonBody(calls[0]).campaignIds, [5, 6]);
});
