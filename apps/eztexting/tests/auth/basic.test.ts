import { assert, assertEquals } from "@std/assert";
import basic, { authHeader } from "../../auth/basic.ts";
import { API_ROOT, apiError, mockCtx } from "../_helpers.ts";

const credential = { appKey: "ada@example.com", appSecret: "hunter2" };

Deno.test("basic: sign stamps Authorization: Basic base64(appKey:appSecret)", async () => {
  const request = {
    url: `${API_ROOT}/credits`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = await basic.sign!({ request, credential } as never, {} as never);
  assertEquals(signed.headers["authorization"], `Basic ${btoa("ada@example.com:hunter2")}`);
  assertEquals(authHeader(credential), signed.headers["authorization"]);
});

Deno.test("basic: credential fields are secrets and the type is basic", () => {
  assertEquals(basic.type, "basic");
  for (const f of basic.fields ?? []) assertEquals(f.type, "secret", f.key);
});

Deno.test("basic: test passes on a documented credit balance and probes GET /v1/credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { planCredits: 1, anytimeCredits: 2, totalCredits: 3 },
  }]);
  assertEquals(await basic.test({ credential } as never, ctx), { ok: true });
  assertEquals(calls[0].url, `${API_ROOT}/credits`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("basic: test never echoes the credential into its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: apiError(401, "Invalid username or password") }]);
  const result = await basic.test({ credential } as never, ctx);
  assert(!JSON.stringify(result).includes("hunter2"));
  assert(!JSON.stringify(result).includes(btoa("ada@example.com:hunter2")));
});

Deno.test("basic: a 401 'Invalid username or password' body is a rejected credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: apiError(401, "Invalid username or password") }]);
  const result = await basic.test({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("rejected the credential"), result.message);
  assert(result.message?.includes("Invalid username or password"), result.message);
});

Deno.test("basic: a 200 without totalCredits is NOT ok — an SPA-shell 200 proves nothing", async () => {
  const { ctx } = mockCtx([{
    body: "<html>hello</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await basic.test({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("without a credit balance"), result.message);
});

Deno.test("basic: a 500 is not a statement about the credential", async () => {
  const { ctx } = mockCtx([{ status: 500, body: apiError(500, "boom") }]);
  const result = await basic.test({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not a clear statement about the credential"), result.message);
});

Deno.test("basic: an unreachable host says so, and not that the credential is wrong", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as never;
  const result = await basic.test({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not a statement about the credential"), result.message);
});

Deno.test("basic: a credential with a missing half fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await basic.test({ credential: { appKey: "x" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
