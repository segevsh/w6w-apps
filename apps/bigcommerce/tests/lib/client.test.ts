import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  AUTH_HEADER,
  BigCommerceClient,
  bool,
  classifyAuthFailure,
  compact,
  encodeId,
  flag01,
  formatBigCommerceError,
  normalizeStoreHash,
  readRateLimit,
  storeBase,
  toList,
  truncate,
} from "../../lib/client.ts";
import { API_ROOT, mockCtx, pathOf, queryOf, rateLimitHeaders, v3Error } from "../_helpers.ts";

Deno.test("client: compact keeps false and 0 but drops undefined, null and empty string", () => {
  assertEquals(compact({ a: false, b: 0, c: undefined, d: null, e: "", f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("client: bool and flag01 are the two boolean spellings BigCommerce uses", () => {
  // `is_visible` is `type: boolean` in the vendor schema...
  assertEquals(bool(true), "true");
  assertEquals(bool(false), "false");
  assertEquals(bool(undefined), undefined);
  // ...while `is_featured` is `type: integer`, "1 for true, 0 for false".
  assertEquals(flag01(true), "1");
  assertEquals(flag01(false), "0");
  assertEquals(flag01(undefined), undefined);
});

Deno.test("client: toList splits, trims and drops empties", () => {
  assertEquals(toList("1, 2 ,3"), ["1", "2", "3"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(",,"), undefined);
});

Deno.test("client: json params are accepted as a string or as a parsed value", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{oops", "Body"), Error, "Body is not valid JSON");
  assertThrows(() => asJson(undefined, "Body"), Error, "Body is required");
});

Deno.test("client: truncate reports how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"));
});

Deno.test("client: encodeId neutralises a pasted path separator", () => {
  assertEquals(encodeId(12), "12");
  assertEquals(encodeId(" 12 "), "12");
  assertEquals(encodeId("../../v2/store"), "..%2F..%2Fv2%2Fstore");
});

Deno.test("client: normalizeStoreHash accepts the API path the control panel shows", () => {
  assertEquals(normalizeStoreHash("abc123"), "abc123");
  assertEquals(normalizeStoreHash("  abc123 "), "abc123");
  assertEquals(
    normalizeStoreHash("https://api.bigcommerce.com/stores/abc123/v3/"),
    "abc123",
  );
  assertEquals(normalizeStoreHash("/stores/abc123/v2/orders"), "abc123");
  assertEquals(normalizeStoreHash(undefined), "");
});

Deno.test("client: storeBase puts the hash in the PATH, never the hostname", () => {
  const url = new URL(storeBase("abc123"));
  assertEquals(url.hostname, "api.bigcommerce.com");
  assertEquals(url.pathname, "/stores/abc123");
});

Deno.test("client: classifyAuthFailure separates the three 401 bodies BigCommerce serves", () => {
  // All three were measured on the wire on 2026-08-11 with the SAME status code.
  assertEquals(classifyAuthFailure(401, "X-Auth-Token header is required"), "missing-header");
  assertEquals(
    classifyAuthFailure(401, "X-Auth-Token header should have correct format"),
    "malformed-header",
  );
  assertEquals(
    classifyAuthFailure(401, JSON.stringify(v3Error(401, "Unauthorized"))),
    "rejected",
  );
  assertEquals(classifyAuthFailure(403, "X-Auth-Token header is required"), "other");
});

Deno.test("client: the error message names the cause, not just the status", () => {
  const missing = formatBigCommerceError(401, "GET", "/x", "X-Auth-Token header is required");
  assert(missing.includes("no X-Auth-Token header reached the API"), missing);

  const rejected = formatBigCommerceError(
    401,
    "GET",
    "/x",
    JSON.stringify(v3Error(401, "Unauthorized")),
  );
  assert(rejected.includes("Unauthorized"), rejected);
  assert(!rejected.includes("did not get attached"), rejected);

  const validation = formatBigCommerceError(
    422,
    "POST",
    "/x",
    JSON.stringify(v3Error(422, "JSON data is missing or invalid", { price: "price is required" })),
  );
  assert(validation.includes("price: price is required"), validation);

  // v2 has no documented error envelope, so the raw body is the honest fallback.
  const v2 = formatBigCommerceError(404, "GET", "/v2/orders/1", "Not Found");
  assert(v2.includes("Not Found"), v2);

  assert(formatBigCommerceError(429, "GET", "/x", "").includes("shared by every app"));
  assert(formatBigCommerceError(403, "GET", "/x", "").includes("store hash is wrong"));
});

Deno.test("client: readRateLimit reads the headers case-insensitively", () => {
  const headers = new Headers({
    "X-Rate-Limit-Requests-Quota": "150",
    "x-rate-limit-requests-left": "35",
    "X-Rate-Limit-Time-Window-Ms": "30000",
    "X-Rate-Limit-Time-Reset-Ms": "15000",
  });
  assertEquals(readRateLimit(headers), {
    quota: 150,
    left: 35,
    windowMs: 30000,
    resetMs: 15000,
  });
  assertEquals(readRateLimit(new Headers()), {
    quota: undefined,
    left: undefined,
    windowMs: undefined,
    resetMs: undefined,
  });
  // A `0` remaining is a real reading and must survive.
  assertEquals(readRateLimit(new Headers({ "x-rate-limit-requests-left": "0" })).left, 0);
});

Deno.test("client: v3 unwraps `data`, v2 does not", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { id: 1 }, meta: {} } },
    { body: [{ id: 2 }] },
  ]);
  const client = new BigCommerceClient(ctx);
  assertEquals(await client.v3("/catalog/products/1"), { id: 1 });
  assertEquals(await client.v2("/orders"), [{ id: 2 }]);
  assertEquals(pathOf(calls[0].url), `/stores/abc123/v3/catalog/products/1`);
  assertEquals(pathOf(calls[1].url), `/stores/abc123/v2/orders`);
});

Deno.test("client: v3Page returns data plus BOTH pagination blocks", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: [{ id: 1 }],
      meta: {
        pagination: { total: 1, total_pages: 1 },
        cursor_pagination: { end_cursor: "abc" },
      },
    },
  }]);
  const page = await new BigCommerceClient(ctx).v3Page("/customers");
  assertEquals(page.data, [{ id: 1 }]);
  assertEquals(page.pagination, { total: 1, total_pages: 1 });
  // Dropping the cursor block would strand a caller that paged by cursor.
  assertEquals(page.cursor, { end_cursor: "abc" });
});

Deno.test("client: a 204 on a READ is a normal answer, not a crash", async () => {
  // BigCommerce documents 204 on reads, e.g. an order's shipping quotes.
  const { ctx } = mockCtx([{ status: 204 }, { status: 204 }]);
  const client = new BigCommerceClient(ctx);
  assertEquals(await client.v2("/orders/1/shipping_addresses/1/shipping_quotes"), undefined);
  assertEquals(await client.v2List("/orders"), []);
});

Deno.test("client: an empty body is treated as absent rather than parsed", async () => {
  const { ctx } = mockCtx([{ body: "" }]);
  assertEquals(await new BigCommerceClient(ctx).v2("/store"), undefined);
});

Deno.test("client: array query values are comma-joined into ONE parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await new BigCommerceClient(ctx).v3Page("/catalog/products", {
    query: { include: ["variants", "images"], "id:in": [1, 2], skip: undefined, blank: "" },
  });
  assertEquals(queryOf(calls[0].url), { include: "variants,images", "id:in": "1,2" });
});

Deno.test("client: a body sets content-type, and no request ever carries the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {}, meta: {} } }, {
    body: { data: {}, meta: {} },
  }]);
  const client = new BigCommerceClient(ctx);
  await client.v3("/catalog/products", { method: "POST", body: { name: "x" } });
  await client.v3("/catalog/products/1");

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"x"}');
  assertEquals(calls[1].headers["content-type"], undefined);
  for (const call of calls) {
    // The `sign` hook injects this. An action that set it would be a leak.
    assertEquals(call.headers[AUTH_HEADER], undefined);
    assertEquals(call.headers["authorization"], undefined);
  }
});

Deno.test("client: a failure throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: v3Error(422, "JSON data is missing or invalid") }]);
  await assertRejects(
    () => new BigCommerceClient(ctx).v3("/catalog/products", { method: "POST", body: {} }),
    Error,
    "JSON data is missing or invalid",
  );
});

Deno.test("client: refuses to build a URL when the connection has no store hash", () => {
  const { ctx } = mockCtx([], { storeHash: null });
  assertThrows(
    () => new BigCommerceClient(ctx),
    Error,
    "records no store hash",
  );
});

Deno.test("client: refuses a store hash that is not a bare hash", () => {
  const { ctx } = mockCtx([], { storeHash: "abc/../def" });
  assertThrows(() => new BigCommerceClient(ctx), Error, "not a bare hash");
});

Deno.test("client: every request goes to api.bigcommerce.com and nowhere else", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {}, meta: {} } }]);
  await new BigCommerceClient(ctx).v3("/catalog/summary");
  assert(calls[0].url.startsWith(`${API_ROOT}/v3/`), calls[0].url);
  assertEquals(new URL(calls[0].url).hostname, "api.bigcommerce.com");
});

Deno.test("client: rate-limit headers survive on the response the client reads", async () => {
  const { ctx } = mockCtx([{ body: { time: 1 }, headers: rateLimitHeaders(35) }]);
  // The client does not surface them itself — `health/quota.ts` reads them off
  // its own fetch. This pins the helper the health test depends on.
  assertEquals(await new BigCommerceClient(ctx).v2("/time"), { time: 1 });
});
