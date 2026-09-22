import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_PREFIX,
  API_URL,
  applyStoreId,
  asJson,
  asOptionalJson,
  compact,
  csv,
  DEFAULT_LIMIT,
  EcwidClient,
  encodeId,
  formatEcwidError,
  mergeBody,
  numList,
  parseEcwidError,
  RATE_LIMIT_PER_MINUTE,
  STORE_PLACEHOLDER,
  storePath,
  storeUrl,
  VENDOR_MAX_LIMIT,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the origin and prefix are Ecwid's single documented server", () => {
  assertEquals(API_URL, "https://app.ecwid.com");
  assertEquals(API_PREFIX, "/api/v3");
  assertEquals(STORE_PLACEHOLDER, "__storeId__");
  assertEquals(RATE_LIMIT_PER_MINUTE, 600);
});

Deno.test("client: the prefilled limit is below the vendor's maximum", () => {
  assertEquals(VENDOR_MAX_LIMIT, 100);
  assert(DEFAULT_LIMIT < VENDOR_MAX_LIMIT, `${DEFAULT_LIMIT} is not below ${VENDOR_MAX_LIMIT}`);
});

Deno.test("client: the path carries the placeholder, the auth hooks build the real one", () => {
  assertEquals(storePath("/products"), "/api/v3/__storeId__/products");
  assertEquals(storeUrl(1003, "/profile"), "https://app.ecwid.com/api/v3/1003/profile");
  assertEquals(
    applyStoreId(`${API_URL}${storePath("/products")}`, "1003"),
    "https://app.ecwid.com/api/v3/1003/products",
  );
});

Deno.test("client: applyStoreId neutralises a store id that is not a plain number", () => {
  assertEquals(
    applyStoreId(`${API_URL}${storePath("/products")}`, " 1003/../x "),
    "https://app.ecwid.com/api/v3/1003%2F..%2Fx/products",
  );
});

Deno.test("client: json() parses the body, and an empty body yields undefined", async () => {
  const { ctx } = mockCtx([{ body: { updateCount: 1 } }]);
  assertEquals(
    await new EcwidClient(ctx).json("/products/1", { method: "PUT", body: {} }),
    { updateCount: 1 },
  );

  const empty = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(
    await new EcwidClient(empty.ctx).json("/products/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: the URL is built under /api/v3/<store> — the placeholder sign fills in", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EcwidClient(ctx).json("/products/692730761");
  assertEquals(calls[0].url, "https://app.ecwid.com/api/v3/__storeId__/products/692730761");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/products/692730761");
});

Deno.test("client: no request carries an Authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EcwidClient(ctx).json("/profile");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: unset query values are dropped, but false and 0 are not", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EcwidClient(ctx).json("/products", {
    query: { enabled: false, offset: 0, keyword: undefined, lang: null, category: "" },
  });
  // `enabled=false` is a real Ecwid filter ("only disabled products"), and
  // `offset=0` is the documented default made explicit.
  assertEquals(queryOf(calls[0].url), { enabled: "false", offset: "0" });
});

Deno.test("client: a JSON body sets the content type the vendor's examples use", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new EcwidClient(ctx).json("/categories", { method: "POST", body: { name: "Fruit" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"Fruit"}');
});

Deno.test("client: the vendor's error code is surfaced verbatim", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("PRODUCT_NOT_FOUND", "Product with ID 1 was not found") },
  ]);
  const err = await assertRejects(() => new EcwidClient(ctx).json("/products/1"), Error);
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("PRODUCT_NOT_FOUND"), err.message);
  assert(err.message.includes("/api/v3/__storeId__/products/1"), err.message);
  assert(err.message.includes("Product with ID 1 was not found"), err.message);
});

Deno.test("client: a bodyless 403 is reported as the credential being refused", async () => {
  // The documented exception (see lib/client.ts's header): this vendor answers
  // 403 with `content-length: 0` for a missing *and* an invalid token, so the
  // status has to carry the verdict.
  const { ctx } = mockCtx([{ status: 403, body: undefined }]);
  const err = await assertRejects(() => new EcwidClient(ctx).json("/profile"), Error);
  assert(err.message.includes("credential was rejected"), err.message);
});

Deno.test("client: formatEcwidError prefers the body and falls back to the status", () => {
  assertEquals(
    formatEcwidError(
      409,
      "POST",
      "/products",
      JSON.stringify(errorBody("SKU_ALREADY_EXISTS", "no")),
    ),
    "Ecwid 409 SKU_ALREADY_EXISTS for POST /products: no",
  );
  assert(
    formatEcwidError(404, "GET", "/profile", "").includes("the store or the addressed record"),
  );
  assert(formatEcwidError(500, "GET", "/profile", "<html>bad gateway</html>").includes("<html>"));
});

Deno.test("client: a 429 carries the vendor's Retry-After value", () => {
  const msg = formatEcwidError(429, "GET", "/products", "", "30");
  assert(msg.includes("retry after 30s"), msg);

  const noHeader = formatEcwidError(429, "GET", "/products", "");
  assert(noHeader.includes("600 requests/minute per token"), noHeader);
});

Deno.test("client: parseEcwidError only accepts the documented shape", () => {
  assertEquals(
    parseEcwidError('{"errorCode":"STORE_NOT_FOUND","errorMessage":"Store not found"}'),
    {
      errorCode: "STORE_NOT_FOUND",
      errorMessage: "Store not found",
    },
  );
  assertEquals(parseEcwidError(""), undefined);
  assertEquals(parseEcwidError("   "), undefined);
  assertEquals(parseEcwidError("<html>nope</html>"), undefined);
  assertEquals(parseEcwidError("[1,2,3]"), undefined);
  assertEquals(parseEcwidError('{"other":1}'), undefined);
  assertEquals(parseEcwidError('{"errorCode":"X"}'), { errorCode: "X", errorMessage: undefined });
});

Deno.test("compact: drops undefined, null and empty string, keeps false, 0 and []", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [] }), {
    a: 1,
    e: false,
    f: 0,
    g: [],
  });
});

Deno.test("mergeBody: free-form JSON wins over the typed fields", () => {
  assertEquals(
    mergeBody({ name: "A", price: 1 }, '{"price":2,"sku":"S"}'),
    { name: "A", price: 2, sku: "S" },
  );
  assertEquals(mergeBody({ name: "A" }, undefined), { name: "A" });
  assertThrows(() => mergeBody({}, "[1,2]"), Error, "must be a JSON object");
  assertThrows(() => mergeBody({}, "{nope}"), Error, "is not valid JSON");
});

Deno.test("asOptionalJson / asJson accept a parsed value or the string a user typed", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  assertEquals(asJson('{"a":1}', "Items"), { a: 1 });
  assertThrows(() => asJson(undefined, "Items"), Error, "Items is required");
});

Deno.test("csv / numList normalise the comma-separated list fields", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(numList("9691094,9691095"), [9691094, 9691095]);
  assertEquals(numList([1, "2"]), [1, 2]);
  assertThrows(() => numList("a"), Error, '"a" is not a number');
});

Deno.test("encodeId escapes a path segment and refuses an empty id", () => {
  assertEquals(encodeId(" 692730761 "), "692730761");
  assertEquals(encodeId("EG4H2/J77J8"), "EG4H2%2FJ77J8");
  assertThrows(() => encodeId("  "), Error, "an id is required");
});
