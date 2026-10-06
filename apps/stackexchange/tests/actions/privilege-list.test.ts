import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/privilege-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("privilege-list: GETs /privileges and returns the wrapper", async () => {
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
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.stackexchange.com/2.3/privileges");
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

Deno.test("privilege-list: optional paging, filter and a different site", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await action.execute({
    ...{},
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
});

Deno.test("privilege-list: surfaces the API error body", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error_id: 400, error_name: "bad_parameter", error_message: "site" } },
  ]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "bad_parameter: site");
});
