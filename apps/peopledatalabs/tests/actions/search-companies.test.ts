import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-companies.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-companies: POSTs the query to /v5/company/search", async () => {
  const query = { term: { website: "google.com" } };
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: [{ name: "google" }], total: 1 } }]);
  const out = await action.execute!({ query, size: 5 } as never, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v5/company/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { query, size: 5 });
  assertEquals(out.found, true);
});

Deno.test("search-companies: no query is refused; 404 is an empty page", async () => {
  const none = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({} as never, none.ctx),
    Error,
    "Give an Elasticsearch",
  );
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: "not_found" } } }]);
  const out = await action.execute!(
    { sql: "SELECT * FROM company WHERE x=1" } as never,
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(out.found, false);
  assertEquals(out.total, 0);
});
