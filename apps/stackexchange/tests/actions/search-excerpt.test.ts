import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-excerpt.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-excerpt: GETs /search/excerpts and returns the wrapper", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        items: [{ id: 1 }, { id: 2 }],
        has_more: true,
        quota_remaining: 290,
        quota_max: 300,
        backoff: 2,
      },
    },
  ]);
  const out = await action.execute({
    "q": "x",
    "accepted": "x",
    "answers": 3,
    "body": "x",
    "closed": "x",
    "migrated": "x",
    "notice": "x",
    "nottagged": "a,b",
    "tagged": "a,b",
    "title": "x",
    "user": 3,
    "url": "x",
    "views": 3,
    "wiki": "x",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.stackexchange.com/2.3/search/excerpts");
  assertEquals(url.searchParams.get("site"), "stackoverflow");
  assertEquals(url.searchParams.get("q"), "x");
  assertEquals(url.searchParams.get("accepted"), "x");
  assertEquals(url.searchParams.get("answers"), "3");
  assertEquals(url.searchParams.get("body"), "x");
  assertEquals(url.searchParams.get("closed"), "x");
  assertEquals(url.searchParams.get("migrated"), "x");
  assertEquals(url.searchParams.get("notice"), "x");
  assertEquals(url.searchParams.get("nottagged"), "a;b");
  assertEquals(url.searchParams.get("tagged"), "a;b");
  assertEquals(url.searchParams.get("title"), "x");
  assertEquals(url.searchParams.get("user"), "3");
  assertEquals(url.searchParams.get("url"), "x");
  assertEquals(url.searchParams.get("views"), "3");
  assertEquals(url.searchParams.get("wiki"), "x");
  assertEquals(out, {
    items: [{ id: 1 }, { id: 2 }],
    count: 2,
    hasMore: true,
    quotaRemaining: 290,
    quotaMax: 300,
    backoff: 2,
    total: null,
  });
});

Deno.test("search-excerpt: optional paging, filter and a different site", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await action.execute({
    ...{
      "q": "x",
      "accepted": "x",
      "answers": 3,
      "body": "x",
      "closed": "x",
      "migrated": "x",
      "notice": "x",
      "nottagged": "a,b",
      "tagged": "a,b",
      "title": "x",
      "user": 3,
      "url": "x",
      "views": 3,
      "wiki": "x",
    },
    site: "serverfault",
    page: 2,
    pageSize: 5,
    filter: "withbody",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("pagesize"), "5");
  assertEquals(url.searchParams.get("filter"), "withbody");
  assertEquals(url.searchParams.get("site"), "serverfault");
  const page = out as { count: number; hasMore: boolean };
  assertEquals(page.count, 0);
  assertEquals(page.hasMore, false);
  const { ctx: c2, calls: k2 } = mockCtx([{ body: { items: [] } }]);
  await action.execute({
    sort: "relevance",
    order: "asc",
    fromDate: "2026-01-01T00:00:00Z",
    toDate: 1700000000,
    min: "5",
    ...{
      "q": "x",
      "accepted": "x",
      "answers": 3,
      "body": "x",
      "closed": "x",
      "migrated": "x",
      "notice": "x",
      "nottagged": "a,b",
      "tagged": "a,b",
      "title": "x",
      "user": 3,
      "url": "x",
      "views": 3,
      "wiki": "x",
    },
  }, c2);
  const u2 = new URL(k2[0].url);
  assertEquals(u2.searchParams.get("sort"), "relevance");
  assertEquals(u2.searchParams.get("order"), "asc");
  assertEquals(u2.searchParams.get("fromdate"), "1767225600");
  assertEquals(u2.searchParams.get("todate"), "1700000000");
  assertEquals(u2.searchParams.get("min"), "5");
});

Deno.test("search-excerpt: surfaces the API error body", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error_id: 400, error_name: "bad_parameter", error_message: "site" } },
  ]);
  await assertRejects(
    async () =>
      await action.execute({
        "q": "x",
        "accepted": "x",
        "answers": 3,
        "body": "x",
        "closed": "x",
        "migrated": "x",
        "notice": "x",
        "nottagged": "a,b",
        "tagged": "a,b",
        "title": "x",
        "user": 3,
        "url": "x",
        "views": 3,
        "wiki": "x",
      }, ctx),
    Error,
    "bad_parameter: site",
  );
});
