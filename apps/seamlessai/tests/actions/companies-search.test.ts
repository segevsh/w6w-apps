import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-search.ts";

const RESPONSE = {
  "data": [{ "searchResultId": "cmp_1" }],
  "supplementalData": { "isMore": true, "nextToken": "n" },
};

Deno.test("companies-search: calls POST /api/client/v2/search/companies and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "companyName": ["Acme Inc"],
    "companyNameSearchType": "related",
    "companyDomain": ["acme.com"],
    "locations": ["Austin, Texas"],
    "companyCountry": ["United States"],
    "companyState": ["Texas"],
    "industry": ["Computer Software"],
    "companySize": ["11 - 50"],
    "companyRevenue": ["$1M - $5M"],
    "technologies": ["HubSpot"],
    "technologiesIsOr": false,
    "companyKeyword": ["analytics"],
    "companyType": "Public",
    "newsTypes": ["Investment"],
    "savedSearchId": 77,
    "limit": 10,
    "page": 3,
    "nextToken": "tok_xyz",
    "filters": { "foundedOn": ["Last 1-3 Years"] },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/search/companies");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "foundedOn": ["Last 1-3 Years"],
    "companyName": ["Acme Inc"],
    "companyNameSearchType": "related",
    "companyDomain": ["acme.com"],
    "locations": ["Austin, Texas"],
    "companyCountry": ["United States"],
    "companyState": ["Texas"],
    "industry": ["Computer Software"],
    "companySize": ["11 - 50"],
    "companyRevenue": ["$1M - $5M"],
    "technologies": ["HubSpot"],
    "technologiesIsOr": false,
    "companyKeyword": ["analytics"],
    "companyType": "Public",
    "newsTypes": ["Investment"],
    "savedSearchId": 77,
    "limit": 10,
    "page": 3,
    "nextToken": "tok_xyz",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("companies-search: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("companies-search: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "companyName": ["Acme Inc"],
        "companyNameSearchType": "related",
        "companyDomain": ["acme.com"],
        "locations": ["Austin, Texas"],
        "companyCountry": ["United States"],
        "companyState": ["Texas"],
        "industry": ["Computer Software"],
        "companySize": ["11 - 50"],
        "companyRevenue": ["$1M - $5M"],
        "technologies": ["HubSpot"],
        "technologiesIsOr": false,
        "companyKeyword": ["analytics"],
        "companyType": "Public",
        "newsTypes": ["Investment"],
        "savedSearchId": 77,
        "limit": 10,
        "page": 3,
        "nextToken": "tok_xyz",
        "filters": { "foundedOn": ["Last 1-3 Years"] },
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
