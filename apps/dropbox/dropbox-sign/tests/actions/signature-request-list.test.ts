import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-list.ts";

Deno.test("list: pages the signature_requests collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: { num_pages: 1 }, signature_requests: [{ signature_request_id: "sr1" }] },
  }]);
  const result = await action.execute!({ limit: 5 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/signature_request/list");
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "5");
  assertEquals(result, [{ signature_request_id: "sr1" }]);
});

/** The query is Dropbox Sign's own grammar and is passed through verbatim. */
Deno.test("list: the search query and account id reach the wire unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: {}, signature_requests: [] },
  }]);
  await action.execute!(
    { query: "complete:false AND from:ada@example.com", accountId: "all" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("query"), "complete:false AND from:ada@example.com");
  assertEquals(q.get("account_id"), "all");
});

Deno.test("list: returnAll walks every page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { list_info: { num_pages: 2 }, signature_requests: [{ id: "a" }] } },
    { status: 200, body: { list_info: { num_pages: 2 }, signature_requests: [{ id: "b" }] } },
  ]);
  const result = await action.execute!({ returnAll: true, limit: 1 }, ctx) as unknown[];
  assertEquals(result.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});
