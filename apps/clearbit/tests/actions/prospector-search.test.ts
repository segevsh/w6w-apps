import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prospector-search.ts";

Deno.test("prospector-search: GETs prospector.clearbit.com/v1/people/search?domain=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { page: 1, page_size: 5, total: 0, results: [] } }]);
  const result = await action.execute!({ domain: "clearbit.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://prospector.clearbit.com/v1/people/search?domain=clearbit.com",
  );
  assertEquals(result, { page: 1, page_size: 5, total: 0, results: [] });
});

Deno.test("prospector-search: filters and pagination map to query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!(
    {
      domain: "clearbit.com",
      title: "VP of Sales",
      seniority: "executive",
      role: "sales",
      city: "San Francisco",
      state: "CA",
      country: "US",
      name: "Alex",
      page: 2,
      pageSize: 10,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("title"), "VP of Sales");
  assertEquals(url.searchParams.get("seniority"), "executive");
  assertEquals(url.searchParams.get("role"), "sales");
  assertEquals(url.searchParams.get("city"), "San Francisco");
  assertEquals(url.searchParams.get("state"), "CA");
  assertEquals(url.searchParams.get("country"), "US");
  assertEquals(url.searchParams.get("name"), "Alex");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "10");
});

Deno.test("prospector-search: requires domain", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "domain");
  assertEquals(calls.length, 0);
});
