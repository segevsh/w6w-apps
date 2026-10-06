import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-companies.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("search-companies: POSTs the filters to /searchCompany and returns companies", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: [{ id: 7, name: "Acme", email_domain: "acme.com" }],
  }]);
  const out = await run(action, {
    industry: "Software",
    employees: "51-200",
    query: { techstack: ["Salesforce"] },
  }, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/searchCompany");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).query, {
    industry: ["Software"],
    employees: ["51-200"],
    techstack: ["Salesforce"],
  });
  assertEquals(out.companies[0].email_domain, "acme.com");
  assertEquals(out.count, 1);
});

Deno.test("search-companies: requires a filter; an upstream error throws", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "at least one search filter");
  const bad = mockCtx([{ status: 429, headers: { "retry-after": "3" }, body: { detail: "slow" } }]);
  await assertRejects(() => run(action, { name: "x" }, bad.ctx), Error, "retry after 3s");
});

Deno.test("search-companies: default page size is 10", () => {
  assertEquals(action.params!.find((x) => x.key === "page_size")?.default, 10);
});
