import { assert, assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

const OK = { status: 200, body: { results: [], fieldMask: "campaign.id" } };

Deno.test("search: posts the raw GAQL verbatim to googleAds:search", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  const query = "SELECT campaign.id, metrics.clicks FROM campaign WHERE segments.date DURING TODAY";
  await action.execute({ query }, ctx);
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/googleAds:search",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]).query, query);
});

Deno.test("search: a customerId override redirects the call", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute(
    { query: "SELECT campaign.id FROM campaign", customerId: "999-888-7777" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/9998887777/googleAds:search",
  );
});

Deno.test("search: forwards pageToken, validateOnly and searchSettings", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    query: "SELECT campaign.id FROM campaign",
    pageToken: "tok-1",
    validateOnly: true,
    returnTotalResultsCount: true,
    returnSummaryRow: true,
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.pageToken, "tok-1");
  assertEquals(body.validateOnly, true);
  assertEquals(body.searchSettings, { returnTotalResultsCount: true, returnSummaryRow: true });
});

Deno.test("search: omits searchSettings entirely when neither flag is set", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ query: "SELECT campaign.id FROM campaign" }, ctx);
  assertEquals(bodyOf(calls[0]), { query: "SELECT campaign.id FROM campaign" });
});

Deno.test("search: never sends the deprecated pageSize", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ query: "SELECT campaign.id FROM campaign" }, ctx);
  assert(!("pageSize" in bodyOf(calls[0])));
  assert(!action.params?.some((p) => p.key === "pageSize"));
});

Deno.test("search: is typed as a search action", () => {
  assertEquals(action.type, "search");
  assertEquals(action.params?.find((p) => p.key === "query")?.required, true);
});

Deno.test("search: surfaces a GAQL error from Google", async () => {
  const { ctx } = mockAdsCtx([{
    status: 400,
    body: {
      error: {
        code: 400,
        message: "Request contains an invalid argument.",
        details: [{
          errors: [{
            errorCode: { queryError: "BAD_RESOURCE_TYPE_IN_FROM_CLAUSE" },
            message: "bad FROM",
          }],
          requestId: "r1",
        }],
      },
    },
  }]);
  const err = await assertRejects(
    async () => await action.execute({ query: "SELECT x FROM nope" }, ctx),
    Error,
  );
  assert(err.message.includes("BAD_RESOURCE_TYPE_IN_FROM_CLAUSE"));
});
