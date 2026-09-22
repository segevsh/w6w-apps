import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-leads.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/list/GetLeadsFromList";

Deno.test("list-get-leads: filters travel in the POST body, not the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({ listId: 7, limit: 100, offset: 0 }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { listId: 7, offset: 0, limit: 100 });
});

Deno.test("list-get-leads: the added-since window and the lead lookup are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { totalCount: 0, items: [] } }]);
  await action.execute!({
    listId: 7,
    leadLinkedInId: "abc123",
    createdFrom: "2026-09-01T00:00:00.000Z",
    createdTo: "2026-09-22T00:00:00.000Z",
    limit: 100,
    offset: 0,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    listId: 7,
    offset: 0,
    limit: 100,
    leadLinkedInId: "abc123",
    createdFrom: "2026-09-01T00:00:00.000Z",
    createdTo: "2026-09-22T00:00:00.000Z",
  });
});
