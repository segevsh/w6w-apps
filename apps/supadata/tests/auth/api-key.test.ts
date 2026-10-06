import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-KEY" };

Deno.test("api-key: sign sets x-api-key (trimmed) and leaves url and other headers alone", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.supadata.ai/v1/me?a=1", method: "GET", headers: { accept: "x" } },
    credential: { apiKey: "  SECRET-KEY " },
  }, ctx);
  assertEquals(out.headers["x-api-key"], "SECRET-KEY");
  assertEquals(out.headers.accept, "x");
  assertEquals(out.url, "https://api.supadata.ai/v1/me?a=1");
});

Deno.test("api-key: test passes only on an account document, via a signed GET /me", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizationId: "o", plan: "p", maxCredits: 1, usedCredits: 0 },
  }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/me");
  assertEquals(calls[0].headers["x-api-key"], "SECRET-KEY");
  const hollow = mockCtx([{ body: { hello: "world" } }]);
  const res = await apiKey.test!({ credential: cred }, hollow.ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("without an account document"));
});

Deno.test("api-key: a rejected key never has its echoed value repeated in the message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: "unauthorized",
      message: "Unauthorized",
      details: "Invalid API Key: SECRET-KEY",
    },
  }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the API key"));
  assert(res.message?.includes("unauthorized"));
  assert(!res.message?.includes("SECRET-KEY"));
});

Deno.test("api-key: a 200-status unauthorized envelope still fails; 429, 5xx and a blank key are distinct", async () => {
  const odd = mockCtx([{
    status: 200,
    body: { error: "unauthorized", message: "m", details: "d" },
  }]);
  assertEquals((await apiKey.test!({ credential: cred }, odd.ctx)).ok, false);
  const busy = mockCtx([{ status: 429, body: "slow down" }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});

Deno.test("api-key: a non-auth error message scrubs an echoed key", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid-request", message: "m", details: "Invalid API Key: SECRET-KEY" },
  }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assert(!res.message?.includes("SECRET-KEY"));
});
