import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-search.ts";

const RESPONSE = {
  "data": [{ "searchResultId": "sr_1" }],
  "supplementalData": { "isMore": false, "total": 1 },
};

Deno.test("contacts-search: calls POST /api/client/v2/search/contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "jobTitle": ["VP of Sales", "Head of Growth"],
    "seniority": ["VP", "Director"],
    "department": ["Sales"],
    "fullName": ["Jane Doe"],
    "companyName": ["Acme Inc"],
    "companyNameSearchType": "exact",
    "companyDomain": ["acme.com"],
    "emailAddress": ["jane@acme.com"],
    "phoneNumber": ["+1 555 123 4567"],
    "locations": ["Austin, Texas"],
    "contactCountry": ["United States"],
    "contactState": ["Texas"],
    "locationType": "company",
    "industry": ["Computer Software"],
    "companySize": ["51 - 200"],
    "companyRevenue": ["$5M - $20M"],
    "technologies": ["Salesforce"],
    "technologiesIsOr": true,
    "contactKeyword": ["saas"],
    "newsTypes": ["Expansion"],
    "jobChanges": { "changeType": "New Hire", "dayRange": "Last 90 Days" },
    "savedSearchId": 1234,
    "limit": 25,
    "page": 2,
    "nextToken": "tok_abc",
    "filters": { "companyType": "Private" },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/search/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "companyType": "Private",
    "jobTitle": ["VP of Sales", "Head of Growth"],
    "seniority": ["VP", "Director"],
    "department": ["Sales"],
    "fullName": ["Jane Doe"],
    "companyName": ["Acme Inc"],
    "companyNameSearchType": "exact",
    "companyDomain": ["acme.com"],
    "emailAddress": ["jane@acme.com"],
    "phoneNumber": ["+1 555 123 4567"],
    "locations": ["Austin, Texas"],
    "contactCountry": ["United States"],
    "contactState": ["Texas"],
    "locationType": "company",
    "industry": ["Computer Software"],
    "companySize": ["51 - 200"],
    "companyRevenue": ["$5M - $20M"],
    "technologies": ["Salesforce"],
    "technologiesIsOr": true,
    "contactKeyword": ["saas"],
    "newsTypes": ["Expansion"],
    "jobChanges": { "changeType": "New Hire", "dayRange": "Last 90 Days" },
    "savedSearchId": 1234,
    "limit": 25,
    "page": 2,
    "nextToken": "tok_abc",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("contacts-search: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("contacts-search: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "jobTitle": ["VP of Sales", "Head of Growth"],
        "seniority": ["VP", "Director"],
        "department": ["Sales"],
        "fullName": ["Jane Doe"],
        "companyName": ["Acme Inc"],
        "companyNameSearchType": "exact",
        "companyDomain": ["acme.com"],
        "emailAddress": ["jane@acme.com"],
        "phoneNumber": ["+1 555 123 4567"],
        "locations": ["Austin, Texas"],
        "contactCountry": ["United States"],
        "contactState": ["Texas"],
        "locationType": "company",
        "industry": ["Computer Software"],
        "companySize": ["51 - 200"],
        "companyRevenue": ["$5M - $20M"],
        "technologies": ["Salesforce"],
        "technologiesIsOr": true,
        "contactKeyword": ["saas"],
        "newsTypes": ["Expansion"],
        "jobChanges": { "changeType": "New Hire", "dayRange": "Last 90 Days" },
        "savedSearchId": 1234,
        "limit": 25,
        "page": 2,
        "nextToken": "tok_abc",
        "filters": { "companyType": "Private" },
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
