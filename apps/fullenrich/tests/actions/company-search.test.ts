import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-search: maps named filters and paging, returns metadata", async () => {
  const { ctx, calls } = mockCtx([{
    body: { companies: [{ id: "c1" }], metadata: { total: 5, credits: 0.25, search_after: "n" } },
  }]);
  const out = await action.execute!({
    names: "Anthropic",
    industries: ["Software"],
    headquartersLocations: "France",
    offset: 20,
    limit: 10,
  }, ctx);
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/company/search");
  assertEquals(JSON.parse(calls[0].body!), {
    names: [{ value: "Anthropic" }],
    industries: [{ value: "Software" }],
    headquarters_locations: [{ value: "France" }],
    offset: 20,
    limit: 10,
  });
  assertEquals(out, { companies: [{ id: "c1" }], total: 5, credits: 0.25, searchAfter: "n" });
});

Deno.test("company-search: raw filters pass through and named params override them", async () => {
  const { ctx, calls } = mockCtx([{ body: { companies: [] } }]);
  await action.execute!({
    domains: "a.com",
    filters: { domains: [{ value: "raw.com" }], founded_years: [{ min: 2010 }] },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    domains: [{ value: "a.com" }],
    founded_years: [{ min: 2010 }],
  });
});

Deno.test("company-search: a 401 is thrown", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "error.api.key", message: "Unknown api key" },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "Unknown api key");
});
