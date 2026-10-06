import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "wz-secret-123" };
const ok = {
  credits: { email_credits: "unlimited", phone_credits: 100, export_credits: 0, api_credits: 100 },
};

Deno.test("api-key: sign sets a Bearer Authorization header and nothing else", () => {
  const req = {
    url: "https://wiza.co/api/lists",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request: req, credential: cred } as never, {} as never) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer wz-secret-123");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("api-key: test passes on a credits body and probes GET /api/meta/credits", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, true);
  assertEquals(calls[0].url, "https://wiza.co/api/meta/credits");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], "Bearer wz-secret-123");
});

Deno.test("api-key: a 401 envelope fails, and the message never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: { code: 401, message: "Invalid API key." } },
  }]);
  const r = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("Invalid API key."));
  assert(!JSON.stringify(r).includes("wz-secret-123"));
});

Deno.test("api-key: a 200 that is not the credits shape fails (proxy page), as does a 429", async () => {
  const a = mockCtx([{ body: "<html>proxy</html>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, a.ctx)).ok, false);
  const b = mockCtx([{ status: 429, body: { status: { code: 429, message: "slow" } } }]);
  const r = await auth.test!({ credential: cred } as never, b.ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rate limited"));
});

Deno.test("api-key: missing key and an unreachable host both fail", async () => {
  assertEquals((await auth.test!({ credential: {} } as never, mockCtx().ctx)).ok, false);
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} };
  const r = await auth.test!({ credential: cred } as never, ctx as never);
  assertEquals(r.ok, false);
  assert(r.message?.includes("boom"));
});
