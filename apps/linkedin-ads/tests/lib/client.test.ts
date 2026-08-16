import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_VERSION,
  asJson,
  asOptionalJson,
  bareId,
  buildDateRange,
  buildSearch,
  compact,
  encodeUrn,
  epochMsFromDate,
  formatLinkedInAdsError,
  LinkedInAdsClient,
  organizationUrn,
  parseAdsDate,
  restliList,
  sponsoredAccountUrn,
  sponsoredCampaignGroupUrn,
  sponsoredCampaignUrn,
  sponsoredCreativeUrn,
  triState,
} from "../../lib/client.ts";
import {
  createdResponse,
  errorBody,
  mockCtx,
  noContentResponse,
  pathOf,
  queryOf,
} from "../_helpers.ts";

// ---------------------------------------------------------------- URNs -----

Deno.test("sponsoredAccountUrn: builds from a bare id and passes through a URN", () => {
  assertEquals(sponsoredAccountUrn(123), "urn:li:sponsoredAccount:123");
  assertEquals(sponsoredAccountUrn("123"), "urn:li:sponsoredAccount:123");
  assertEquals(sponsoredAccountUrn("urn:li:sponsoredAccount:123"), "urn:li:sponsoredAccount:123");
});

Deno.test("sponsoredCampaignGroupUrn / sponsoredCampaignUrn / sponsoredCreativeUrn / organizationUrn", () => {
  assertEquals(sponsoredCampaignGroupUrn(1), "urn:li:sponsoredCampaignGroup:1");
  assertEquals(sponsoredCampaignUrn(1), "urn:li:sponsoredCampaign:1");
  assertEquals(sponsoredCreativeUrn(1), "urn:li:sponsoredCreative:1");
  assertEquals(organizationUrn(1), "urn:li:organization:1");
});

Deno.test("bareId: strips any urn:li:*: prefix, passes a bare id through unchanged", () => {
  assertEquals(bareId("urn:li:sponsoredAccount:512352200"), "512352200");
  assertEquals(bareId(512352200), "512352200");
  assertEquals(bareId("urn:li:sponsoredCreative:120491345"), "120491345");
});

Deno.test("encodeUrn: percent-encodes the colons a URN needs inside a List(...)", () => {
  assertEquals(encodeUrn("urn:li:sponsoredAccount:123"), "urn%3Ali%3AsponsoredAccount%3A123");
});

// ------------------------------------------------------- Rest.li query ----

Deno.test("restliList: List(...) with each member percent-encoded", () => {
  assertEquals(restliList(["ACTIVE", "DRAFT"]), "List(ACTIVE,DRAFT)");
  assertEquals(
    restliList(["urn:li:sponsoredAccount:1", "urn:li:sponsoredAccount:2"]),
    "List(urn%3Ali%3AsponsoredAccount%3A1,urn%3Ali%3AsponsoredAccount%3A2)",
  );
});

Deno.test("buildSearch: ANDs fields, ORs values within a field", () => {
  assertEquals(
    buildSearch([
      { field: "status", values: ["ACTIVE", "CANCELED"] },
      { field: "type", values: ["BUSINESS"] },
    ]),
    "(status:(values:List(ACTIVE,CANCELED)),type:(values:List(BUSINESS)))",
  );
});

Deno.test("buildSearch: a scalar criterion (test:true) is not wrapped in values:List", () => {
  assertEquals(buildSearch([{ field: "test", scalar: "true" }]), "(test:true)");
});

Deno.test("buildSearch: drops empty/undefined criteria, returns '' when nothing is left", () => {
  assertEquals(
    buildSearch([{ field: "status", values: [] }, { field: "name", values: undefined }]),
    "",
  );
  assertEquals(buildSearch([]), "");
});

Deno.test("buildSearch: mixes list and scalar criteria in the given order", () => {
  assertEquals(
    buildSearch([{ field: "status", values: ["ACTIVE"] }, { field: "test", scalar: "false" }]),
    "(status:(values:List(ACTIVE)),test:false)",
  );
});

Deno.test("triState: recognizes booleans and their string forms, else undefined", () => {
  assertEquals(triState(true), "true");
  assertEquals(triState("true"), "true");
  assertEquals(triState(false), "false");
  assertEquals(triState("false"), "false");
  assertEquals(triState(undefined), undefined);
  assertEquals(triState(""), undefined);
});

Deno.test("parseAdsDate: parses YYYY-MM-DD, rejects garbage, passes through undefined", () => {
  assertEquals(parseAdsDate("2024-01-15"), { year: 2024, month: 1, day: 15 });
  assertEquals(parseAdsDate(undefined), undefined);
  assertThrows(() => parseAdsDate("not-a-date"), Error, "Not a YYYY-MM-DD date");
});

Deno.test("buildDateRange: start only, and start+end", () => {
  assertEquals(
    buildDateRange({ year: 2024, month: 1, day: 1 }),
    "(start:(year:2024,month:1,day:1))",
  );
  assertEquals(
    buildDateRange({ year: 2024, month: 1, day: 1 }, { year: 2024, month: 12, day: 31 }),
    "(start:(year:2024,month:1,day:1),end:(year:2024,month:12,day:31))",
  );
});

Deno.test("epochMsFromDate: a plain YYYY-MM-DD is midnight UTC; undefined passes through", () => {
  assertEquals(epochMsFromDate("2024-01-01"), Date.parse("2024-01-01T00:00:00Z"));
  assertEquals(epochMsFromDate(undefined), undefined);
  assertThrows(() => epochMsFromDate("nonsense"), Error, "Not a valid date");
});

// ------------------------------------------------------------------ json --

Deno.test("asOptionalJson / asJson: accept a parsed value or a JSON string, reject bad JSON", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(
    () => asOptionalJson("{not json", "targetingCriteria"),
    Error,
    "targetingCriteria is not valid JSON",
  );
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  assertThrows(
    () => asJson(undefined, "targetingCriteria"),
    Error,
    "targetingCriteria is required",
  );
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

// ---------------------------------------------------------------- errors --

Deno.test("formatLinkedInAdsError: surfaces the vendor's code and message verbatim", () => {
  const msg = formatLinkedInAdsError(
    401,
    "GET",
    "/rest/adAccounts",
    JSON.stringify({ status: 401, code: "INVALID_ACCESS_TOKEN", message: "Invalid access token" }),
  );
  assert(msg.includes("401"));
  assert(msg.includes("INVALID_ACCESS_TOKEN"));
  assert(msg.includes("Invalid access token"));
});

Deno.test("formatLinkedInAdsError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatLinkedInAdsError(500, "GET", "/rest/adAccounts", "upstream exploded");
  assert(msg.includes("500"));
  assert(msg.includes("upstream exploded"));
});

// ------------------------------------------------------------- transport --

Deno.test("LinkedInAdsClient: sends the two Rest.li headers and the pinned version on every call", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInAdsClient(ctx).request("/rest/adAccounts");

  assertEquals(calls[0].headers["x-restli-protocol-version"], "2.0.0");
  assertEquals(calls[0].headers["linkedin-version"], API_VERSION);
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts");
});

Deno.test("LinkedInAdsClient: appends pre-built query values verbatim, without re-encoding parens", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInAdsClient(ctx).request("/rest/adAccounts", {
    query: { q: "search", search: "(status:(values:List(ACTIVE)))", empty: "" },
  });

  assertEquals(queryOf(calls[0].url).search, "(status:(values:List(ACTIVE)))");
  assertEquals(queryOf(calls[0].url).q, "search");
  assert(!calls[0].url.includes("empty="), "empty-string query values must be dropped");
});

Deno.test("LinkedInAdsClient: sets X-RestLi-Method when given one", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInAdsClient(ctx).request("/rest/adAccounts", { restliMethod: "FINDER" });
  assertEquals(calls[0].headers["x-restli-method"], "FINDER");
});

Deno.test("LinkedInAdsClient: a 201 with an empty body and x-restli-id surfaces { id }", async () => {
  const { ctx } = mockCtx([createdResponse("512352200")]);
  const result = await new LinkedInAdsClient(ctx).request("/rest/adAccounts", { method: "POST" });
  assertEquals(result, { id: "512352200" });
});

Deno.test("LinkedInAdsClient: a 204 returns undefined", async () => {
  const { ctx } = mockCtx([noContentResponse()]);
  const result = await new LinkedInAdsClient(ctx).request("/rest/adAccounts/1", {
    method: "DELETE",
  });
  assertEquals(result, undefined);
});

Deno.test("LinkedInAdsClient: JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await new LinkedInAdsClient(ctx).request("/rest/adAccounts", {
    method: "POST",
    body: { name: "A" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "A" });
});

Deno.test("LinkedInAdsClient: a non-ok response throws with the formatted vendor error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("INVALID_ACCESS_TOKEN", "Invalid access token"),
  }]);
  await assertRejectsMessage(
    () => new LinkedInAdsClient(ctx).request("/rest/adAccounts"),
    "INVALID_ACCESS_TOKEN",
  );
});

async function assertRejectsMessage(fn: () => Promise<unknown>, contains: string) {
  try {
    await fn();
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes(contains), e.message);
    return;
  }
  throw new Error("expected a rejection");
}
