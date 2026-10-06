import { assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const GOOD = { success: true, data: { credits: 4825 }, metadata: { credits_consumed: 0 } };
const BAD = { success: false, error: { code: "INVALID_API_KEY", message: "Invalid API Key" } };

Deno.test("api-key: sign stamps x-api-key and trims", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.linkupapi.com/v2/credits", method: "GET", headers: {} },
    credential: { apiKey: "  k-123 " },
  }, ctx);
  assertEquals(out.headers["x-api-key"], "k-123");
});

Deno.test("api-key: test passes on a credit balance, probing GET /v2/credits signed", async () => {
  const { ctx, calls } = mockCtx([{ body: GOOD }]);
  assertEquals(await apiKey.test({ credential: { apiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/credits");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("api-key: test fails on INVALID_API_KEY (a 403), classified from the body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: BAD }]);
  const r = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.includes("rejected the API key"), true);
});

Deno.test("api-key: a 200 that is not a credit balance is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: {} } }]);
  assertEquals((await apiKey.test({ credential: { apiKey: "k" } }, ctx)).ok, false);
});

Deno.test("api-key: test reports a rate limit and unexpected errors distinctly", async () => {
  const a = mockCtx([{ status: 429, body: { success: false, error: { code: "RATE_LIMITED" } } }]);
  assertEquals(
    (await apiKey.test({ credential: { apiKey: "k" } }, a.ctx)).message?.includes("429"),
    true,
  );
  const b = mockCtx([{
    status: 500,
    body: { success: false, error: { code: "INTERNAL_ERROR", message: "boom" } },
  }]);
  assertEquals(
    (await apiKey.test({ credential: { apiKey: "k" } }, b.ctx)).message?.includes("INTERNAL_ERROR"),
    true,
  );
});

Deno.test("api-key: a missing key fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await apiKey.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
