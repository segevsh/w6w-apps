import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/people-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("people-search: maps named filters, merges raw filters and paginates", async () => {
  const { ctx, calls } = mockCtx([{
    body: { people: [{ id: "p1" }], metadata: { total: 99, credits: 0.25, search_after: "abc" } },
  }]);
  const out = await action.execute!({
    titles: "CTO, VP Engineering",
    companyDomains: ["google.com"],
    filters: '{"current_company_headcounts":[{"min":50,"max":200}]}',
    limit: 5,
    searchAfter: "cur",
  }, ctx);
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/people/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    current_position_titles: [{ value: "CTO" }, { value: "VP Engineering" }],
    current_company_domains: [{ value: "google.com" }],
    current_company_headcounts: [{ min: 50, max: 200 }],
    limit: 5,
    search_after: "cur",
  });
  assertEquals(out, { people: [{ id: "p1" }], total: 99, credits: 0.25, searchAfter: "abc" });
});

Deno.test("people-search: an empty search sends an empty body and tolerates no results", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { people: [], total: null, credits: null, searchAfter: null });
});

Deno.test("people-search: rate limiting is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { code: "error.rate.limit", message: "Too many requests. Try again in 1m" },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "error.rate.limit");
});
