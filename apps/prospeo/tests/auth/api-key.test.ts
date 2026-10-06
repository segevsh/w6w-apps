import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "pk-secret-123" };
const ok = { error: false, response: { current_plan: "PRO", remaining_credits: 5 } };

Deno.test("api-key: sign sets X-KEY and nothing else", () => {
  const req = {
    url: "https://api.prospeo.io/enrich-person",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request: req, credential: cred } as never, {} as never) as typeof req;
  assertEquals(out.headers["x-key"], "pk-secret-123");
  assertEquals(Object.keys(out.headers), ["x-key"]);
});

Deno.test("api-key: test passes on an error:false account body and probes /account-information", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, true);
  assertEquals(calls[0].url, "https://api.prospeo.io/account-information");
  assertEquals(calls[0].headers["x-key"], "pk-secret-123");
});

Deno.test("api-key: HTTP 400 INVALID_API_KEY fails, and the message never echoes the key", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: true, error_code: "INVALID_API_KEY" } }]);
  const r = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("INVALID_API_KEY"));
  assert(!JSON.stringify(r).includes("pk-secret-123"));
});

Deno.test("api-key: 429 proves a live key; a 200 that is not the account shape fails", async () => {
  const a = mockCtx([{ status: 429, body: "slow down" }]);
  assertEquals((await auth.test!({ credential: cred } as never, a.ctx)).ok, true);
  const b = mockCtx([{ body: "<html>proxy</html>" }]);
  assertEquals((await auth.test!({ credential: cred } as never, b.ctx)).ok, false);
});

Deno.test("api-key: missing key and an unreachable host both fail without a verdict on the key", async () => {
  assertEquals((await auth.test!({ credential: {} } as never, mockCtx().ctx)).ok, false);
  const ctx = { fetch: () => Promise.reject(new Error("boom")), log: () => {} };
  const r = await auth.test!({ credential: cred } as never, ctx as never);
  assertEquals(r.ok, false);
  assert(r.message?.includes("boom"));
});
