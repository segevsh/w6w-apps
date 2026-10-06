import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/post-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-get: GETs /posts/9 and returns the wrapper", async () => {
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
  const out = await action.execute({ "postIds": "9" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.stackexchange.com/2.3/posts/9");
  assertEquals(url.searchParams.get("site"), "stackoverflow");
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

Deno.test("post-get: optional paging, filter and a different site", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await action.execute({
    ...{ "postIds": "9" },
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
    sort: "votes",
    order: "asc",
    fromDate: "2026-01-01T00:00:00Z",
    toDate: 1700000000,
    min: "5",
    ...{ "postIds": "9" },
  }, c2);
  const u2 = new URL(k2[0].url);
  assertEquals(u2.searchParams.get("sort"), "votes");
  assertEquals(u2.searchParams.get("order"), "asc");
  assertEquals(u2.searchParams.get("fromdate"), "1767225600");
  assertEquals(u2.searchParams.get("todate"), "1700000000");
  assertEquals(u2.searchParams.get("min"), "5");
});

Deno.test("post-get: surfaces the API error body", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error_id: 400, error_name: "bad_parameter", error_message: "site" } },
  ]);
  await assertRejects(
    async () => await action.execute({ "postIds": "9" }, ctx),
    Error,
    "bad_parameter: site",
  );
});
