import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockAdsCtx, mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  API_URL,
  API_VERSION,
  assertDateRange,
  assertEnum,
  assertIsoDate,
  assertNumericId,
  buildGaql,
  compact,
  customerIdFromConnection,
  describeError,
  fieldPaths,
  GoogleAdsClient,
  jsonObject,
  normalizeCustomerId,
  resolveResourceName,
  resourceName,
  unset,
} from "../../lib/client.ts";

Deno.test("client: pins the v25 REST base on the Google Ads host", () => {
  assertEquals(API_HOST, "googleads.googleapis.com");
  assertEquals(API_VERSION, "v25");
  assertEquals(API_URL, "https://googleads.googleapis.com/v25");
});

Deno.test("normalizeCustomerId: accepts the dashed form Google's own UI shows", () => {
  assertEquals(normalizeCustomerId("123-456-7890"), "1234567890");
  assertEquals(normalizeCustomerId("1234567890"), "1234567890");
  assertEquals(normalizeCustomerId(" 123-456-7890 "), "1234567890");
});

Deno.test("normalizeCustomerId: refuses anything that is not digits", () => {
  assertThrows(() => normalizeCustomerId("abc"), Error, "numeric Google Ads customer ID");
  assertThrows(() => normalizeCustomerId(""), Error, "numeric Google Ads customer ID");
  assertThrows(() => normalizeCustomerId("12/34"), Error, "numeric Google Ads customer ID");
});

Deno.test("customerIdFromConnection: the per-action override wins", () => {
  const connection = { display: { customerId: "1111111111" } } as never;
  assertEquals(customerIdFromConnection(connection, "222-222-2222"), "2222222222");
  assertEquals(customerIdFromConnection(connection), "1111111111");
});

Deno.test("customerIdFromConnection: says so when neither is available", () => {
  assertThrows(() => customerIdFromConnection(undefined), Error, "No customer ID");
});

Deno.test("client: GET builds the versioned URL and sets no credential header", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { resourceNames: ["customers/1"] } }]);
  const out = await new GoogleAdsClient(ctx).request("/customers:listAccessibleCustomers");
  assertEquals(out, { resourceNames: ["customers/1"] });
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers:listAccessibleCustomers",
  );
  assertEquals(calls[0].method, "GET");
  // The runtime's `sign` hook adds these; the client must never do so itself.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["developer-token"], undefined);
  assertEquals(calls[0].headers["login-customer-id"], undefined);
});

Deno.test("client: search POSTs GAQL to googleAds:search under the connection's customer", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  const client = new GoogleAdsClient(ctx);
  await client.search(client.customerId(), { query: "SELECT campaign.id FROM campaign" });

  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/googleAds:search",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { query: "SELECT campaign.id FROM campaign" });
});

Deno.test("client: search never sends the deprecated pageSize field", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  const client = new GoogleAdsClient(ctx);
  await client.search(client.customerId(), {
    query: "SELECT campaign.id FROM campaign",
    pageToken: "tok",
    validateOnly: true,
  });
  const body = JSON.parse(calls[0].body!);
  // `page_size` is deprecated in SearchGoogleAdsRequest and answered with
  // PAGE_SIZE_NOT_SUPPORTED, so it must never appear.
  assert(!("pageSize" in body), "pageSize must never be sent");
  assertEquals(body.pageToken, "tok");
  assertEquals(body.validateOnly, true);
});

Deno.test("client: search omits an empty searchSettings block", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  const client = new GoogleAdsClient(ctx);
  await client.search(client.customerId(), {
    query: "SELECT campaign.id FROM campaign",
    searchSettings: {},
  });
  assert(!("searchSettings" in JSON.parse(calls[0].body!)));
});

Deno.test("client: search forwards searchSettings when asked", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  const client = new GoogleAdsClient(ctx);
  await client.search(client.customerId(), {
    query: "SELECT campaign.id FROM campaign",
    searchSettings: { returnTotalResultsCount: true },
  });
  assertEquals(JSON.parse(calls[0].body!).searchSettings, { returnTotalResultsCount: true });
});

Deno.test("client: mutate posts to the resource collection's :mutate verb", async () => {
  const { ctx, calls } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  const client = new GoogleAdsClient(ctx);
  await client.mutate(client.customerId(), "campaignBudgets", { operations: [{ create: {} }] });
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/campaignBudgets:mutate",
  );
  assertEquals(calls[0].method, "POST");
});

Deno.test("client: an empty 200 body is not a JSON parse error", async () => {
  const { ctx } = mockAdsCtx([{ status: 200, body: undefined }]);
  assertEquals(
    await new GoogleAdsClient(ctx).request("/customers:listAccessibleCustomers"),
    undefined,
  );
});

Deno.test("client: surfaces the GoogleAdsFailure detail, not just the envelope", async () => {
  const { ctx } = mockAdsCtx([{
    status: 400,
    body: {
      error: {
        code: 400,
        message: "Request contains an invalid argument.",
        status: "INVALID_ARGUMENT",
        details: [{
          errors: [{
            errorCode: { queryError: "BAD_FIELD_NAME" },
            message: "Error in query: unrecognized field in the SELECT clause.",
          }],
          requestId: "req-abc",
        }],
      },
    },
  }]);
  const err = await assertRejects(
    () => new GoogleAdsClient(ctx).request("/customers/1/googleAds:search", { method: "POST" }),
    Error,
  );
  assert(err.message.includes("400"));
  assert(err.message.includes("queryError=BAD_FIELD_NAME"));
  assert(err.message.includes("unrecognized field"));
  assert(err.message.includes("requestId=req-abc"));
});

Deno.test("describeError: falls back to the raw body when it is not JSON", () => {
  const msg = describeError(502, "GET", "/v25/x", "<html>bad gateway</html>");
  assert(msg.includes("502"));
  assert(msg.includes("bad gateway"));
});

Deno.test("client: refuses to run without a customer id", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new GoogleAdsClient(ctx).customerId(), Error, "No customer ID");
});

Deno.test("buildGaql: emits the clauses in GAQL's fixed order", () => {
  assertEquals(
    buildGaql({
      select: ["campaign.id", "campaign.name"],
      from: "campaign",
      where: ["campaign.status = ENABLED", undefined, "  "],
      orderBy: "campaign.id",
      limit: 50,
    }),
    "SELECT campaign.id, campaign.name FROM campaign WHERE campaign.status = ENABLED ORDER BY campaign.id LIMIT 50",
  );
});

Deno.test("buildGaql: ANDs multiple predicates and omits empty clauses", () => {
  assertEquals(
    buildGaql({ select: ["campaign.id"], from: "campaign", where: ["a = 1", "b = 2"] }),
    "SELECT campaign.id FROM campaign WHERE a = 1 AND b = 2",
  );
  assertEquals(
    buildGaql({ select: ["campaign.id"], from: "campaign" }),
    "SELECT campaign.id FROM campaign",
  );
});

Deno.test("buildGaql: refuses an empty SELECT", () => {
  assertThrows(() => buildGaql({ select: [], from: "campaign" }), Error, "at least one SELECT");
});

Deno.test("assertNumericId: closes the interpolation seam", () => {
  assertEquals(assertNumericId("123", "campaignId"), "123");
  assertEquals(assertNumericId("123-456", "campaignId"), "123456");
  assertThrows(() => assertNumericId("1 OR 1=1", "campaignId"), Error, "numeric ID");
});

Deno.test("assertEnum: only bare GAQL enum words get through", () => {
  assertEquals(assertEnum("enabled", "status"), "ENABLED");
  assertEquals(assertEnum("PERFORMANCE_MAX", "type"), "PERFORMANCE_MAX");
  assertThrows(() => assertEnum("ENABLED OR 1=1", "status"), Error, "bare GAQL enum");
  assertThrows(() => assertEnum("'ENABLED'", "status"), Error, "bare GAQL enum");
});

Deno.test("assertDateRange: enforces Google's closed set", () => {
  assertEquals(assertDateRange("last_30_days"), "LAST_30_DAYS");
  assertEquals(assertDateRange("THIS_MONTH"), "THIS_MONTH");
  assertThrows(() => assertDateRange("LAST_45_DAYS"), Error, "dateRange");
});

Deno.test("assertIsoDate: enforces yyyy-MM-dd", () => {
  assertEquals(assertIsoDate("2026-08-01", "startDate"), "2026-08-01");
  assertThrows(() => assertIsoDate("01/08/2026", "startDate"), Error, "ISO date");
  assertThrows(() => assertIsoDate("2026-08-01' OR '1", "startDate"), Error, "ISO date");
});

Deno.test("resourceName / resolveResourceName: id or full name, both work", () => {
  assertEquals(resourceName("123", "campaigns", "42"), "customers/123/campaigns/42");
  assertEquals(
    resolveResourceName("123", "campaigns", "42", "campaignId"),
    "customers/123/campaigns/42",
  );
  assertEquals(
    resolveResourceName("123", "campaigns", "customers/999/campaigns/42", "campaignId"),
    "customers/999/campaigns/42",
  );
  assertThrows(
    () => resolveResourceName("123", "campaigns", "not-an-id", "campaignId"),
    Error,
    "numeric ID",
  );
});

Deno.test("fieldPaths: splits a mask and rejects anything that is not a field path", () => {
  assertEquals(fieldPaths("name, status", "updateMask"), ["name", "status"]);
  assertEquals(fieldPaths("manual_cpc.enhanced_cpc_enabled", "updateMask"), [
    "manual_cpc.enhanced_cpc_enabled",
  ]);
  assertEquals(fieldPaths(undefined, "updateMask"), []);
  assertThrows(() => fieldPaths("name; DROP", "updateMask"), Error, "not a valid field path");
});

Deno.test("compact / unset: drop unset values but keep false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("jsonObject: parses an object and refuses anything else", () => {
  assertEquals(jsonObject('{"a":1}', "additionalFields"), { a: 1 });
  assertEquals(jsonObject("", "additionalFields"), {});
  assertEquals(jsonObject(undefined, "additionalFields"), {});
  assertThrows(() => jsonObject("[1,2]", "additionalFields"), Error, "must be a JSON object");
});
