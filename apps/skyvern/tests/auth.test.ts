import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey from "../auth/api-key.ts";
import { mockCtx } from "./_helpers.ts";

type TestHook = (input: { credential: unknown }, ctx: HookContext) => Promise<
  { ok: boolean; message?: string }
>;
const test = apiKey.test as unknown as TestHook;

Deno.test("auth: declared as an x-api-key header apiKey method with one secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "x-api-key" });
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type]), [["apiKey", "secret"]]);
});

Deno.test("auth.sign: stamps x-api-key and nothing else", async () => {
  const request = { url: "https://api.skyvern.com/v1/runs", method: "GET", headers: {} } as {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  const signed = await apiKey.sign!(
    { request, credential: { apiKey: "sk_live_123" } } as never,
    mockCtx().ctx,
  );
  assertEquals((signed as typeof request).headers, { "x-api-key": "sk_live_123" });
});

Deno.test("auth.test: a JSON array from the probe is a live key; the key goes in the header only", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(await test({ credential: { apiKey: " sk_1 " } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.skyvern.com/v1/browser_profiles?page_size=1");
  assertEquals(calls[0].headers["x-api-key"], "sk_1");
  assert(!calls[0].url.includes("sk_1"));
});

Deno.test("auth.test: missing credential makes no request", async () => {
  const { ctx, calls } = mockCtx();
  const r = await test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: a wrong key is classified from the body 'Could not validate credentials'", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Could not validate credentials" } }]);
  const r = await test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected the API key"));
});

Deno.test("auth.test: 'Invalid credentials' means the key never reached the request", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Invalid credentials" } }]);
  const r = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("no credential"));
});

Deno.test("auth.test: a 200 whose body is not an array is NOT a pass (status alone never decides)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  const r = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("unexpected body"));
});

Deno.test("auth.test: other failures report the status and vendor detail", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { detail: "boom" } }]);
  const r = await test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("HTTP 500") && r.message.includes("boom"));
});
