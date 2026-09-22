import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/campaign/GetAll";

Deno.test("campaign-list: POSTs paging in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ limit: 100, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 100 });
});

Deno.test("campaign-list: statuses and account ids are sent as arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({
    keyword: "q3",
    statuses: "IN_PROGRESS,PAUSED",
    accountIds: [1, 2],
    limit: 20,
    offset: 40,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    offset: 40,
    limit: 20,
    keyword: "q3",
    statuses: ["IN_PROGRESS", "PAUSED"],
    accountIds: [1, 2],
  });
});
