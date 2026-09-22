import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/blacklist-get-leads.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/blacklist/GetLeads";

Deno.test("blacklist-get-leads: POSTs paging in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ limit: 10, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { offset: 0, limit: 10 });
});

Deno.test("blacklist-get-leads: matchingStatus filters on how the entry resolved", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ matchingStatus: "NotFound", search: "acme", limit: 100, offset: 0 }, ctx);
  assertEquals(jsonBody(calls[0]), {
    offset: 0,
    limit: 100,
    search: "acme",
    matchingStatus: "NotFound",
  });
});
