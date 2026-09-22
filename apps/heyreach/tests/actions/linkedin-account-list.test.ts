import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/linkedin-account-list.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/li_account/GetAll";

Deno.test("linkedin-account-list: POSTs offset and limit in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 1, items: [] } }]);
  await action.execute!({ limit: 100, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 100 });
});

Deno.test("linkedin-account-list: an unset keyword is not sent as an empty filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ limit: 100, offset: 0 }, ctx);
  assertEquals("keyword" in jsonBody(calls[0]), false);
});

Deno.test("linkedin-account-list: a keyword is passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ keyword: "alice", limit: 10, offset: 20 }, ctx);
  assertEquals(jsonBody(calls[0]), { offset: 20, limit: 10, keyword: "alice" });
});
