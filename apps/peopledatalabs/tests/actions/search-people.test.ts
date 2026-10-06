import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-people.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-people: POSTs the Elasticsearch query through unchanged", async () => {
  const query = { bool: { must: [{ term: { job_title_role: "health" } }] } };
  const { ctx, calls } = mockCtx([{
    body: { status: 200, data: [{ id: "a" }], total: 5, scroll_token: "t1" },
  }]);
  const out = await action.execute!(
    {
      query: JSON.stringify(query),
      size: 10,
      dataset: "all",
      titlecase: true,
      scroll_token: "t0",
    } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v5/person/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query,
    size: 10,
    dataset: "all",
    titlecase: true,
    scroll_token: "t0",
  });
  assertEquals(out.total, 5);
  assertEquals(out.scroll_token, "t1");
  assertEquals(out.found, true);
});

Deno.test("search-people: a SQL query goes as `sql`; both or neither is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: [], total: 0 } }]);
  await action.execute!(
    { sql: "SELECT * FROM person WHERE location_country='mexico'" } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    sql: "SELECT * FROM person WHERE location_country='mexico'",
  });
  const none = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({} as never, none.ctx),
    Error,
    "Give an Elasticsearch",
  );
  await assertRejects(
    async () => await action.execute!({ query: "{}", sql: "SELECT 1" } as never, none.ctx),
    Error,
    "not both",
  );
  await assertRejects(
    async () => await action.execute!({ sql: "SELECT 1", size: 101 } as never, none.ctx),
    Error,
    "between 1 and 100",
  );
});

Deno.test("search-people: a 404 (no more records) is an empty page, not an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  const out = await action.execute!(
    { sql: "SELECT * FROM person WHERE x=1" } as never,
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(out.found, false);
  assertEquals(out.data, []);
  assertEquals(out.scroll_token, null);
});
