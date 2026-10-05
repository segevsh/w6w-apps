import { assertEquals, assertRejects } from "@std/assert";
import suiteqlQuery from "../../actions/suiteql-query.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

const row = (n: number) => ({ links: [], id: String(n) });

Deno.test("suiteql-query: POSTs {q} with Prefer: transient and paging in the URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [row(1)], count: 1, offset: 10, hasMore: false, totalResults: 11 },
  }]);
  const out = await run(
    suiteqlQuery,
    { query: "SELECT id FROM customer", limit: 10, offset: 10 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/query/v1/suiteql?limit=10&offset=10`);
  assertEquals(calls[0].headers["prefer"], "transient");
  assertEquals(JSON.parse(calls[0].body!), { q: "SELECT id FROM customer" });
  assertEquals(out, {
    items: [row(1)],
    count: 1,
    offset: 10,
    hasMore: false,
    totalResults: 11,
    pages: 1,
  });
});

Deno.test("suiteql-query: bound parameters are sent as params, never spliced into q", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasMore: false } }]);
  await run(suiteqlQuery, {
    query: "SELECT * FROM item WHERE id BETWEEN ? AND ?",
    params: '["-7","0"]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    q: "SELECT * FROM item WHERE id BETWEEN ? AND ?",
    params: ["-7", "0"],
  });
});

Deno.test("suiteql-query: fetchAll walks hasMore page by page with advancing offsets", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [row(1), row(2)], hasMore: true, totalResults: 5 } },
    { body: { items: [row(3), row(4)], hasMore: true, totalResults: 5 } },
    { body: { items: [row(5)], hasMore: false, totalResults: 5 } },
  ]);
  const out = await run(suiteqlQuery, { query: "SELECT id FROM t", limit: 2, fetchAll: true }, ctx);
  assertEquals(calls.map((c) => new URL(c.url).searchParams.get("offset")), ["0", "2", "4"]);
  assertEquals(out.count, 5);
  assertEquals(out.pages, 3);
  assertEquals(out.hasMore, false);
  assertEquals(out.totalResults, 5);
});

Deno.test("suiteql-query: maxRows caps fetchAll and says more remain", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [row(1), row(2), row(3)], hasMore: true } },
    { body: { items: [row(4), row(5), row(6)], hasMore: true } },
  ]);
  const out = await run(suiteqlQuery, {
    query: "SELECT id FROM t",
    limit: 3,
    fetchAll: true,
    maxRows: 4,
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals((out.items as unknown[]).length, 4);
  assertEquals(out.hasMore, true);
});

Deno.test("suiteql-query: a single page is one request even when more exist", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [row(1)], hasMore: true } }]);
  const out = await run(suiteqlQuery, { query: "SELECT id FROM t" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.hasMore, true);
});

Deno.test("suiteql-query: empty query, ragged offset and non-array params are refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await run(suiteqlQuery, { query: " " }, ctx), Error, "required");
  await assertRejects(
    async () => await run(suiteqlQuery, { query: "x", limit: 10, offset: 5 }, ctx),
    Error,
    "multiple of `limit`",
  );
  await assertRejects(
    async () => await run(suiteqlQuery, { query: "x", params: '{"a":1}' }, ctx),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});
