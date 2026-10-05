import { assert, assertEquals } from "@std/assert";
import secretKey, { PROBE_TOKEN } from "../../auth/secret-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const INVALID = errorBody("The provided secret key is invalid.", "validation/invalid-secret-key");

Deno.test("sign: stamps X-API-KEY and nothing else", () => {
  const req = secretKey.sign!({
    request: { url: "https://admin.memberstack.com/members", method: "GET", headers: {} },
    credential: { apiKey: "sk_sb_abc" },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(req.headers, { "x-api-key": "sk_sb_abc" });
});

Deno.test("test: INVALID_TOKEN (400) for the junk token means the key was accepted", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: errorBody("Invalid token", "INVALID_TOKEN"),
  }]);
  const out = await secretKey.test({ credential: { apiKey: "sk_live" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/members/verify-token");
  assertEquals(calls[0].headers["x-api-key"], "sk_live");
  assertEquals(JSON.parse(calls[0].body!), { token: PROBE_TOKEN });
});

Deno.test("test: invalid-secret-key is a rejection at BOTH 401 and 400 (body, not status)", async () => {
  for (const status of [401, 400]) {
    const { ctx } = mockCtx([{ status, body: INVALID }]);
    const out = await secretKey.test({ credential: { apiKey: "sk_bad" } } as never, ctx);
    assertEquals(out.ok, false, `status ${status}`);
    assert(out.message?.includes("rejected the secret key"));
  }
});

Deno.test("test: an unrecognised 400 is NOT treated as a pass", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("something else") }]);
  const out = await secretKey.test({ credential: { apiKey: "sk_x" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("could not be confirmed"));
});

Deno.test("test: a missing key fails without a request, and no message echoes the key", async () => {
  const none = mockCtx([]);
  assertEquals((await secretKey.test({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 401, body: INVALID }]);
  const out = await secretKey.test({ credential: { apiKey: "sk_SECRETVALUE" } } as never, ctx);
  assert(!JSON.stringify(out).includes("SECRETVALUE"));
});
