import { assertEquals } from "@std/assert";
import apiKey, { probeRequest } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "  k_123  " };

Deno.test("api-key sign: stamps the trimmed key into X-Api-Key", async () => {
  const { ctx } = mockCtx();
  const req = await apiKey.sign!({ request: probeRequest(), credential: cred }, ctx);
  assertEquals(req.headers["x-api-key"], "k_123");
});

Deno.test("api-key test: ok when the probe returns the user", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "u1", attributes: { email: "a@b.c" } } },
  }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.leadfeeder.com/v1/users/me");
  assertEquals(calls[0].headers["x-api-key"], "k_123");
});

Deno.test("api-key test: reads the vendor code, not the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ code: "invalid_api_key", title: "bad" }] },
  }]);
  const r = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.includes("invalid_api_key"), true);
});

Deno.test("api-key test: missing key never calls the network", async () => {
  const { ctx, calls } = mockCtx();
  const r = await apiKey.test!({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key test: 200 without a user is not ok; 500 and 429 are reported", async () => {
  for (
    const [status, needle] of [[200, "no user"], [500, "erroring"], [429, "rate-limited"]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { data: {} } }]);
    const r = await apiKey.test!({ credential: cred }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message?.includes(needle), true);
  }
});

Deno.test("api-key afterConnect: labels the connection with the email", async () => {
  const { ctx } = mockCtx([{ body: { data: { id: "u1", attributes: { email: "a@b.c" } } } }]);
  assertEquals(await apiKey.afterConnect!({ credential: cred }, ctx), { user: "a@b.c" });
});
