import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "KEY", apiSecret: "SECRET" };

Deno.test("sign stamps Api-Key and Api-Secret", async () => {
  const req = { url: `${API_ROOT}/events`, method: "GET", headers: {} as Record<string, string> };
  // deno-lint-ignore no-explicit-any
  const out = await (apiKey.sign as any)({ request: req, credential: cred });
  assertEquals(out.headers["api-key"], "KEY");
  assertEquals(out.headers["api-secret"], "SECRET");
});

Deno.test("test: pong true is ok, and the probe is GET /ping", async () => {
  const { ctx, calls } = mockCtx([{ body: { pong: true, sandbox: true } }]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await (apiKey.test as any)({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, `${API_ROOT}/ping`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("test: 401 body pong false is a rejection that never echoes the credential", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { pong: false, messages: ["Authorization failed"] },
  }]);
  // deno-lint-ignore no-explicit-any
  const r = await (apiKey.test as any)({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("Authorization failed"));
  assert(!r.message.includes("SECRET") && !r.message.includes("KEY"));
});

Deno.test("test: 403 inactive account is classified from the body", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { pong: false, messages: ["Account is not active"] },
  }]);
  // deno-lint-ignore no-explicit-any
  const r = await (apiKey.test as any)({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("Account is not active"));
});

Deno.test("test: a non-JSON answer is not treated as valid", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>" }]);
  // deno-lint-ignore no-explicit-any
  assertEquals((await (apiKey.test as any)({ credential: cred }, ctx)).ok, false);
});

Deno.test("test: missing secret fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  const r = await (apiKey.test as any)({ credential: { apiKey: "K" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});
