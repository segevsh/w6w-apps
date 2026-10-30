import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { BrandfetchClient, compact, encodeSegment, errorText, truncate } from "../../lib/client.ts";
import { brandOutput, pickLogoUrl } from "../../lib/brand.ts";
import { mockCtx } from "../_helpers.ts";

test("client: errorText reads message, error, or the raw text", () => {
  assertEquals(errorText('{"message":"Forbidden"}'), "Forbidden");
  assertEquals(errorText('{"error":"quota_exceeded"}'), "quota_exceeded");
  assertEquals(errorText("plain"), "plain");
  assertEquals(errorText("  "), "");
});

test("client: helpers", () => {
  assertEquals(encodeSegment(" a b/c "), "a%20b%2Fc");
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(truncate("x".repeat(10), 5).startsWith("xxxxx…"), true);
});

test("client: sends no credential header and surfaces 429", async () => {
  const { ctx, calls } = mockCtx([{ status: 429, body: { message: "API key quota exceeded" } }]);
  await assertRejects(
    () => new BrandfetchClient(ctx).request("/v2/viewer"),
    Error,
    "API key quota exceeded",
  );
  assertEquals(calls[0].headers.authorization, undefined);
});

test("brand: pickLogoUrl handles absent and empty logos; brandOutput tolerates a bare body", () => {
  assertEquals(pickLogoUrl(undefined, "logo"), undefined);
  assertEquals(pickLogoUrl([{ type: "logo", formats: [] }], "logo"), undefined);
  assertEquals(brandOutput({ status: 200, body: {} }), { found: true });
});
