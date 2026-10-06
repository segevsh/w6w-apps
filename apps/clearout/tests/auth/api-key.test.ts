import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiToken: "SECRET-TOKEN" };
const FAILED = {
  status: "failed",
  error: { code: 1000, message: "Invalid API Token, please generate new token" },
};

Deno.test("api-key: sign sets the bearer header (trimmed) and leaves the URL alone", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.clearout.io/v2/account/credits", method: "GET", headers: {} },
    credential: { apiToken: " SECRET-TOKEN " },
  }, ctx);
  assertEquals(out.headers.authorization, "Bearer SECRET-TOKEN");
  assertEquals(out.url, "https://api.clearout.io/v2/account/credits");
});

Deno.test("api-key: test passes on a 2xx success envelope via the free credits read", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", data: { total_remaining_credits: 5 } },
  }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.clearout.io/v2/account/credits");
  assertEquals(calls[0].headers.authorization, "Bearer SECRET-TOKEN");
});

Deno.test("api-key: a 200 carrying status failed is not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: FAILED }]);
  assertEquals((await apiKey.test!({ credential: cred }, ctx)).ok, false);
});

Deno.test("api-key: 401 / code 1000 is a rejection that never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: FAILED }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
  assert(!res.message?.includes("SECRET-TOKEN"));
});

Deno.test("api-key: 429, 5xx and a missing token get distinct messages", async () => {
  const busy = mockCtx([{
    status: 429,
    body: { status: "failed", error: { code: 1030, message: "slow" } },
  }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiToken: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
