import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import apiKey, { authHeaders } from "../../auth/api-key.ts";

type Test = (input: { credential: unknown }, ctx: HookContext) => Promise<
  { ok: boolean; message?: string }
>;
const test = apiKey.test as unknown as Test;

Deno.test("auth: declares an apiKey method with the X-ApiKey header and a secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-ApiKey" });
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
});

Deno.test("auth.sign: stamps X-ApiKey and nothing else", async () => {
  const request = { headers: {} as Record<string, string>, url: "https://api.lodgify.com/x" };
  const signed = await (apiKey.sign as unknown as (a: unknown) => unknown)({
    request,
    credential: { apiKey: "K-123" },
  }) as typeof request;
  assertEquals(signed.headers, { "x-apikey": "K-123" });
  assertEquals(authHeaders({}), { "x-apikey": "" });
});

Deno.test("auth.test: a property page proves the key is live", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  assertEquals(await test({ credential: { apiKey: " K " } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.lodgify.com/v2/properties?size=1");
  assertEquals(calls[0].headers["x-apikey"], "K");
});

Deno.test("auth.test: 403 (empty body, as measured live) and 401 are a rejected key", async () => {
  for (const status of [403, 401]) {
    const { ctx } = mockCtx([{ status, body: undefined }]);
    const r = await test({ credential: { apiKey: "bad" } }, ctx);
    assertEquals(r.ok, false);
    assert(r.message!.includes(String(status)), r.message);
  }
});

Deno.test("auth.test: surfaces the vendor's own message when the rejection carries one", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Authorization has been denied for this request.", code: 999 },
  }]);
  const r = await test({ credential: { apiKey: "bad" } }, ctx);
  assert(r.message!.includes("Authorization has been denied"));
});

Deno.test("auth.test: a 200 that is not a property page does not confirm the key", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  const r = await test({ credential: { apiKey: "K" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("auth.test: a missing key never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: a 500 is reported, not treated as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "boom", code: 1 } }]);
  const r = await test({ credential: { apiKey: "K" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("500") && r.message!.includes("boom"));
});
