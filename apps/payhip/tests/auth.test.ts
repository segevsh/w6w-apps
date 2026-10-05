import { assertEquals } from "@std/assert";
import type { AuthDefinition } from "@w6w/types";
import productSecretKey from "../auth/product-secret-key.ts";
import apiKey from "../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "./_helpers.ts";

type Hooks = {
  sign(a: unknown): { headers: Record<string, string> };
  test(a: unknown, ctx: unknown): Promise<{ ok: boolean; message: string }>;
};
const sign = (a: AuthDefinition, credential: unknown) =>
  (a as unknown as Hooks).sign({
    request: { url: "https://payhip.com/x", method: "GET", headers: {} },
    credential,
  });
const test = (a: AuthDefinition, credential: unknown, ctx: unknown) =>
  (a as unknown as Hooks).test({ credential }, ctx);

Deno.test("product-secret-key: sign stamps the product-secret-key header", () => {
  const r = sign(productSecretKey, { productSecretKey: "sek" });
  assertEquals(r.headers, { "product-secret-key": "sek" });
});

Deno.test("api-key: sign stamps the payhip-api-key header", () => {
  const r = sign(apiKey, { apiKey: "k" });
  assertEquals(r.headers, { "payhip-api-key": "k" });
});

Deno.test("auth: secret fields are secrets", () => {
  for (const a of [productSecretKey, apiKey]) assertEquals(a.fields![0].type, "secret");
});

Deno.test("test: a blank credential fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test(productSecretKey, { productSecretKey: " " }, ctx)).ok, false);
  assertEquals((await test(apiKey, {}, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("product-secret-key test: probes a v2 verify of a key that cannot exist", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  assertEquals((await test(productSecretKey, { productSecretKey: "sek" }, ctx)).ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v2/license/verify");
  assertEquals(queryOf(calls[0].url), { license_key: "w6w-connection-probe" });
  assertEquals(calls[0].headers["product-secret-key"], "sek");
});

Deno.test("api-key test: probes v1 verify with the legacy header", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  assertEquals((await test(apiKey, { apiKey: "k" }, ctx)).ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v1/license/verify");
  assertEquals(calls[0].headers["payhip-api-key"], "k");
});

Deno.test("test: 401/403 is a rejection, 5xx/429 is a retry hint, neither echoes the key", async () => {
  for (const status of [401, 403, 500, 429]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const r = await test(productSecretKey, { productSecretKey: "sek-secret" }, ctx);
    assertEquals(r.ok, false, String(status));
    assertEquals(r.message.includes("sek-secret"), false);
  }
});
