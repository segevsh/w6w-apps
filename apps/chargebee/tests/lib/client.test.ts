import { assert, assertEquals, assertThrows } from "@std/assert";
import { connected, mockCtx, TEST_API_URL } from "../_helpers.ts";
import {
  apiHost,
  asList,
  asObject,
  asRows,
  ChargebeeClient,
  encodeForm,
  filterDateRange,
  filterIs,
  formEntries,
  isValidSite,
  JSON_ENCODED_KEYS,
  normalizeSite,
  pathId,
  resolveApiUrl,
  sortBy,
  transposeRows,
} from "../../lib/client.ts";

// -------------------------------------------------------------- the host --

Deno.test("normalizeSite: accepts the bare name, the host and a whole base URL", () => {
  assertEquals(normalizeSite("acme"), "acme");
  assertEquals(normalizeSite("acme.chargebee.com"), "acme");
  assertEquals(normalizeSite("https://acme.chargebee.com"), "acme");
  assertEquals(normalizeSite("https://acme.chargebee.com/api/v2"), "acme");
  assertEquals(normalizeSite("https://acme.chargebee.com/api/v2/customers?x=1"), "acme");
  assertEquals(normalizeSite("  ACME.Chargebee.COM  "), "acme");
});

Deno.test("normalizeSite: keeps `-test`, because a test site is a DIFFERENT site", () => {
  // Folding this away would silently point every request at production.
  assertEquals(normalizeSite("acme-test"), "acme-test");
  assertEquals(normalizeSite("https://acme-test.chargebee.com/api/v2"), "acme-test");
});

Deno.test("isValidSite: a site name is a single DNS label", () => {
  assert(isValidSite("acme"));
  assert(isValidSite("acme-test"));
  assert(isValidSite("a1"));
  assert(!isValidSite(""));
  assert(!isValidSite("evil.example.com"));
  assert(!isValidSite("-leading"));
  assert(!isValidSite("trailing-"));
  assert(!isValidSite("has space"));
});

Deno.test("apiHost: builds the per-site host and refuses anything that is not a label", () => {
  assertEquals(apiHost("acme"), "acme.chargebee.com");
  assertEquals(apiHost("https://acme-test.chargebee.com/api/v2"), "acme-test.chargebee.com");
  assertThrows(() => apiHost(""), Error, "missing a site name");
  // A dotted value would otherwise be interpolated into a host nobody intended.
  assertThrows(() => apiHost("evil.example.com"), Error, "not a Chargebee site name");
});

Deno.test("resolveApiUrl: site -> full v2 base URL", () => {
  assertEquals(resolveApiUrl({ site: "acme" }), "https://acme.chargebee.com/api/v2");
  assertEquals(resolveApiUrl({ site: "acme-test" }), "https://acme-test.chargebee.com/api/v2");
  assertThrows(() => resolveApiUrl(undefined), Error, "missing a site name");
});

Deno.test("pathId: percent-encodes a caller-chosen id but keeps `/`", () => {
  assertEquals(pathId("cust_1"), "cust_1");
  assertEquals(pathId("a b"), "a%20b");
  assertEquals(pathId("a?b#c"), "a%3Fb%23c");
  assertEquals(pathId("a/b"), "a/b");
});

// ----------------------------------------------------------- form encoding --

Deno.test("formEntries: scalars go out as plain key=value", () => {
  assertEquals(formEntries({ first_name: "John", net_term_days: 30 }), [
    ["first_name", "John"],
    ["net_term_days", "30"],
  ]);
});

Deno.test("formEntries: booleans go out lowercase", () => {
  assertEquals(formEntries({ end_of_term: true, prorate: false }), [
    ["end_of_term", "true"],
    ["prorate", "false"],
  ]);
});

Deno.test("formEntries: nested objects become `key[sub]` — Chargebee's own sample", () => {
  // -d "billing_address[line1]"="PO Box 9999" -d "billing_address[city]"="Walnut"
  assertEquals(
    formEntries({ billing_address: { line1: "PO Box 9999", city: "Walnut", country: "US" } }),
    [
      ["billing_address[line1]", "PO Box 9999"],
      ["billing_address[city]", "Walnut"],
      ["billing_address[country]", "US"],
    ],
  );
});

Deno.test("formEntries: nesting goes deeper than one level", () => {
  assertEquals(formEntries({ a: { b: { c: "d" } } }), [["a[b][c]", "d"]]);
});

Deno.test("formEntries: a top-level array becomes `key[0]`, `key[1]`", () => {
  assertEquals(formEntries({ coupon_ids: ["EARLYBIRD", "LOYALTY"] }), [
    ["coupon_ids[0]", "EARLYBIRD"],
    ["coupon_ids[1]", "LOYALTY"],
  ]);
});

Deno.test("formEntries: object-of-arrays reproduces Chargebee's line-item sample exactly", () => {
  // -d "subscription_items[item_price_id][0]"="basic-USD"
  // -d "subscription_items[billing_cycles][0]"=2
  // -d "subscription_items[quantity][0]"=1
  // -d "subscription_items[item_price_id][1]"="day-pass-USD"
  // -d "subscription_items[unit_price][1]"=100
  const entries = formEntries({
    subscription_items: {
      item_price_id: ["basic-USD", "day-pass-USD"],
      billing_cycles: [2],
      quantity: [1],
      unit_price: [undefined, 100],
    },
  });
  assertEquals(entries, [
    ["subscription_items[item_price_id][0]", "basic-USD"],
    ["subscription_items[item_price_id][1]", "day-pass-USD"],
    ["subscription_items[billing_cycles][0]", "2"],
    ["subscription_items[quantity][0]", "1"],
    ["subscription_items[unit_price][1]", "100"],
  ]);
});

Deno.test("formEntries: array indices are POSITIONAL and are never re-packed", () => {
  // This is the whole reason the encoder skips in place rather than filtering.
  // Re-indexing would move `100` to index 0 and charge it against the wrong
  // item price.
  assertEquals(
    formEntries({ subscription_items: { unit_price: [undefined, 100, null, 300] } }),
    [
      ["subscription_items[unit_price][1]", "100"],
      ["subscription_items[unit_price][3]", "300"],
    ],
  );
});

Deno.test("formEntries: empty, null and undefined values are dropped entirely", () => {
  assertEquals(
    formEntries({ a: undefined, b: null, c: "", d: "kept", e: { f: undefined, g: "kept" } }),
    [["d", "kept"], ["e[g]", "kept"]],
  );
});

Deno.test("formEntries: zero and false are NOT dropped — they are real values", () => {
  // `trial_end: 0` means "skip the trial", which is the opposite of omitting it.
  assertEquals(formEntries({ trial_end: 0, end_of_term: false }), [
    ["trial_end", "0"],
    ["end_of_term", "false"],
  ]);
});

Deno.test("formEntries: meta_data is JSON-stringified, not bracket-expanded", () => {
  // Matches the official SDKs' `jsonKeys` handling for level-0 `meta_data`.
  assert(JSON_ENCODED_KEYS.has("meta_data"));
  assertEquals(formEntries({ meta_data: { crm_id: "abc", nested: { x: 1 } } }), [
    ["meta_data", '{"crm_id":"abc","nested":{"x":1}}'],
  ]);
});

Deno.test("formEntries: a meta_data string is passed through as-is", () => {
  assertEquals(formEntries({ meta_data: '{"already":"json"}' }), [
    ["meta_data", '{"already":"json"}'],
  ]);
});

Deno.test("encodeForm: percent-encodes the brackets, as the official SDKs do", () => {
  const encoded = encodeForm({ billing_address: { city: "Walnut" } });
  assertEquals(encoded, "billing_address%5Bcity%5D=Walnut");
  // And it round-trips back to the bracket form a server sees after decoding.
  assertEquals([...new URLSearchParams(encoded).keys()], ["billing_address[city]"]);
});

// -------------------------------------------------------------- coercions --

Deno.test("transposeRows: row-wise input becomes the columnar wire shape", () => {
  const columns = transposeRows([
    { item_price_id: "basic-USD", quantity: 1 },
    { item_price_id: "day-pass-USD", unit_price: 100 },
  ]);
  assertEquals(Object.keys(columns), ["item_price_id", "quantity", "unit_price"]);
  assertEquals(columns.item_price_id, ["basic-USD", "day-pass-USD"]);
  assertEquals(columns.quantity, [1]);
  // `unit_price` is SPARSE — index 0 is a hole, not `undefined` written in.
  // Asserted index-by-index because a sparse array and a dense one full of
  // `undefined` are different objects, and only the sparse one is produced here.
  assertEquals(columns.unit_price.length, 2);
  assertEquals(columns.unit_price[0], undefined);
  assertEquals(columns.unit_price[1], 100);
});

Deno.test("transposeRows: a missing key leaves a HOLE, so columns stay aligned", () => {
  const columns = transposeRows([
    { item_price_id: "a" },
    { item_price_id: "b", quantity: 5 },
  ]);
  // `quantity` has nothing at index 0 and 5 at index 1 — matching row 1.
  assertEquals(columns.quantity.length, 2);
  assertEquals(columns.quantity[0], undefined);
  assertEquals(columns.quantity[1], 5);
  assertEquals(formEntries({ subscription_items: columns }), [
    ["subscription_items[item_price_id][0]", "a"],
    ["subscription_items[item_price_id][1]", "b"],
    ["subscription_items[quantity][1]", "5"],
  ]);
});

Deno.test("asRows: accepts an array, a single object, and a JSON string", () => {
  assertEquals(asRows([{ a: 1 }], "x"), [{ a: 1 }]);
  assertEquals(asRows({ a: 1 }, "x"), [{ a: 1 }]);
  assertEquals(asRows('[{"a":1}]', "x"), [{ a: 1 }]);
  assertEquals(asRows(undefined, "x"), []);
  assertEquals(asRows("", "x"), []);
});

Deno.test("asRows: rejects malformed JSON and non-object rows rather than dropping them", () => {
  assertThrows(() => asRows("{not json", "Subscription items"), Error, "not valid JSON");
  assertThrows(() => asRows([1, 2], "Subscription items"), Error, "array of objects");
  assertThrows(() => asRows("[[1]]", "Subscription items"), Error, "array of objects");
});

Deno.test("asObject: parses a JSON string, passes an object through, drops empties", () => {
  assertEquals(asObject('{"a":1}', "x"), { a: 1 });
  assertEquals(asObject({ a: 1 }, "x"), { a: 1 });
  assertEquals(asObject(undefined, "x"), undefined);
  assertEquals(asObject("", "x"), undefined);
  assertThrows(() => asObject("[1]", "Metadata"), Error, "must be a JSON object");
  assertThrows(() => asObject("nope", "Metadata"), Error, "not valid JSON");
});

Deno.test("asList: accepts an array, a JSON array string, and a comma-separated string", () => {
  assertEquals(asList(["A", "B"], "x"), ["A", "B"]);
  assertEquals(asList('["A","B"]', "x"), ["A", "B"]);
  assertEquals(asList("A, B ,C", "x"), ["A", "B", "C"]);
  assertEquals(asList(undefined, "x"), undefined);
  assertThrows(() => asList('{"a":1}', "Coupon IDs"), Error, "must be a JSON array");
});

// ---------------------------------------------------------------- filters --

Deno.test("filterIs: wraps a value in Chargebee's `is` operator, or drops it", () => {
  assertEquals(filterIs("active"), { is: "active" });
  assertEquals(filterIs(false), { is: false });
  assertEquals(filterIs(undefined), undefined);
  assertEquals(filterIs(""), undefined);
  // On the wire that is `status[is]=active`, never `status=active`.
  assertEquals(formEntries({ status: filterIs("active") }), [["status[is]", "active"]]);
});

Deno.test("filterDateRange: one bound uses after/before, two bounds use `between`", () => {
  assertEquals(filterDateRange(1435054328, undefined), { after: 1435054328 });
  assertEquals(filterDateRange(undefined, 1435154328), { before: 1435154328 });
  // The documented literal form, matching the spec's `^\[\d{10},\d{10}\]$`.
  assertEquals(filterDateRange(1435054328, 1435154328), { between: "[1435054328,1435154328]" });
  assertEquals(filterDateRange(undefined, undefined), undefined);
  assertEquals(
    formEntries({ date: filterDateRange(1435054328, 1435154328) }),
    [["date[between]", "[1435054328,1435154328]"]],
  );
});

Deno.test("sortBy: emits sort_by[asc] / sort_by[desc], and nothing without an attribute", () => {
  assertEquals(sortBy("created_at", "asc"), { asc: "created_at" });
  assertEquals(sortBy("created_at", "desc"), { desc: "created_at" });
  // An unspecified direction defaults to ascending rather than dropping the sort.
  assertEquals(sortBy("created_at", undefined), { asc: "created_at" });
  assertEquals(sortBy(undefined, "desc"), undefined);
});

// ----------------------------------------------------------------- client --

Deno.test("client: GETs the per-site base URL with bracketed query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: [] } }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers", {
    query: { limit: 5, email: { is: "a@b.com" } },
  });
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://acme.chargebee.com");
  assertEquals(url.pathname, "/api/v2/customers");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("email[is]"), "a@b.com");
});

Deno.test("client: a different connection points at a different host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: [] } }]);
  await ChargebeeClient.fromConnection(connected(ctx, "acme-test")).request("/customers");
  assertEquals(new URL(calls[0].url).origin, "https://acme-test.chargebee.com");
});

Deno.test("client: a form body implies POST and the form-urlencoded content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { customer: { id: "c1" } } }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers", {
    form: { first_name: "John" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "first_name=John");
});

Deno.test("client: never JSON — there is no JSON request body in the v2 surface", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers", {
    form: { first_name: "John" },
  });
  assert(!/application\/json/.test(calls[0].headers["content-type"] ?? ""));
  assert(!(calls[0].body ?? "").startsWith("{"));
});

Deno.test("client: sends no query string when nothing is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: [] } }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers", { query: {} });
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: surfaces Chargebee's api_error_code and message on failure", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      message: "id : cannot be blank",
      type: "invalid_request",
      api_error_code: "invalid_request",
      http_status_code: 400,
    },
  }]);
  const client = ChargebeeClient.fromConnection(connected(ctx));
  const err = await client.request("/customers", { form: {} }).catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("400"));
  assert(err.message.includes("invalid_request"));
  assert(err.message.includes("id : cannot be blank"));
  assert(err.message.includes("/api/v2/customers"));
});

Deno.test("client: falls back to raw text when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const client = ChargebeeClient.fromConnection(connected(ctx));
  const err = await client.request("/customers").catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("502"));
  assert(err.message.includes("bad gateway"));
});

Deno.test("client: rejects a 200 whose body is not JSON rather than returning undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>login</html>" }]);
  const client = ChargebeeClient.fromConnection(connected(ctx));
  const err = await client.request("/customers").catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("non-JSON body"));
});

Deno.test("client: an empty body is undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const out = await ChargebeeClient.fromConnection(connected(ctx)).request("/customers");
  assertEquals(out, undefined);
});

Deno.test("client: fails loudly when the connection carries no site", () => {
  const { ctx } = mockCtx();
  assertThrows(() => ChargebeeClient.fromConnection(ctx), Error, "missing a site name");
});

Deno.test("TEST_API_URL matches what the client actually builds", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await ChargebeeClient.fromConnection(connected(ctx)).request("/customers");
  assertEquals(calls[0].url, `${TEST_API_URL}/customers`);
});
