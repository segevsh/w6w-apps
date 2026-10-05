import { assertEquals, assertRejects } from "@std/assert";
import verify from "../../actions/license-verify.ts";
import { KEY, LICENSE, OUT } from "../_fixtures.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("license-verify: GET /api/v2/license/verify with license_key in the query, no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: LICENSE } }]);
  const out = await verify.execute(KEY, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/license/verify");
  assertEquals(new URL(calls[0].url).host, "payhip.com");
  assertEquals(queryOf(calls[0].url), { license_key: KEY.licenseKey });
  assertEquals(calls[0].body, null);
  assertEquals(out, OUT);
});

Deno.test("license-verify: carries no credential (sign adds it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: LICENSE } }]);
  await verify.execute(KEY, ctx);
  assertEquals(calls[0].headers["product-secret-key"], undefined);
  assertEquals(calls[0].headers["payhip-api-key"], undefined);
});

Deno.test("license-verify: an empty response is found:false, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const out = await verify.execute(KEY, ctx) as Record<string, unknown>;
  assertEquals(out.found, false);
  assertEquals(out.enabled, null);
  assertEquals(out.uses, null);
});

Deno.test("license-verify: legacy v1 uses /api/v1 and sends product_link", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: LICENSE } }]);
  await verify.execute({ ...KEY, apiVersion: "v1", productLink: "mVT0" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/license/verify");
  assertEquals(queryOf(calls[0].url), { product_link: "mVT0", license_key: KEY.licenseKey });
});

Deno.test("license-verify: v1 without productLink fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(verify.execute({ ...KEY, apiVersion: "v1" }, ctx)),
    Error,
    "productLink",
  );
  assertEquals(calls.length, 0);
});

Deno.test("license-verify: a missing licenseKey fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(verify.execute({ licenseKey: " " }, ctx)),
    Error,
    "licenseKey",
  );
  assertEquals(calls.length, 0);
});

Deno.test("license-verify: HTML (a non-documented shape) is an error, not found:false", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => Promise.resolve(verify.execute(KEY, ctx)), Error, "non-JSON");
});

Deno.test("license-verify: a 5xx is an error", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }]);
  await assertRejects(() => Promise.resolve(verify.execute(KEY, ctx)), Error, "502");
});
