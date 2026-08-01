import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("search: POSTs /<index>/_search with the given query body", async () => {
  const { ctx, calls } = mockCtx([{ body: { hits: { hits: [] } } }], { display });
  const result = await action.execute(
    { index: "my-index", query: { query: { match: { title: "hello" } } } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_search");
  assertEquals(JSON.parse(calls[0].body!), { query: { match: { title: "hello" } } });
  assertEquals(result, { hits: { hits: [] } });
});

Deno.test("search: defaults to match_all when no query is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ index: "my-index" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { query: { match_all: {} } });
});

Deno.test("search: size/from/sort override the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute(
    {
      index: "my-index",
      query: { query: { match_all: {} }, size: 5 },
      size: 20,
      from: 40,
      sort: [{ createdAt: "desc" }],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    query: { match_all: {} },
    size: 20,
    from: 40,
    sort: [{ createdAt: "desc" }],
  });
});
