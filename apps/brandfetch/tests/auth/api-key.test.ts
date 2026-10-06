import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-KEY" };

Deno.test("api-key: sign sets the bearer header and leaves the URL alone", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.brandfetch.io/v2/brands/nike.com", method: "GET", headers: {} },
    credential: { apiKey: " SECRET-KEY ", clientId: "CID" },
  }, ctx);
  assertEquals(out.headers.authorization, "Bearer SECRET-KEY");
  assertEquals(out.url, "https://api.brandfetch.io/v2/brands/nike.com");
});

Deno.test("api-key: the client ID is added as `c` on search requests only", async () => {
  const { ctx } = mockCtx();
  const withId = await apiKey.sign!({
    request: { url: "https://api.brandfetch.io/v2/search/nike", method: "GET", headers: {} },
    credential: { apiKey: "k", clientId: "CID" },
  }, ctx);
  assertEquals(new URL(withId.url).searchParams.get("c"), "CID");
  const without = await apiKey.sign!({
    request: { url: "https://api.brandfetch.io/v2/search/nike", method: "GET", headers: {} },
    credential: { apiKey: "k" },
  }, ctx);
  assertEquals(without.url, "https://api.brandfetch.io/v2/search/nike");
});

Deno.test("api-key: test passes on 2xx via the free viewer, never echoing the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "api-key", id: "k1" } }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/viewer");
  assertEquals(calls[0].headers.authorization, "Bearer SECRET-KEY");
});

Deno.test("api-key: 401, 402 and 403 are rejections that never echo the key", async () => {
  for (
    const [status, message] of [[401, "Unauthorized"], [402, "Payment required"], [
      403,
      "Forbidden",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { message } }]);
    const res = await apiKey.test!({ credential: cred }, ctx);
    assertEquals(res.ok, false);
    assert(res.message?.includes("rejected") && res.message.includes(message));
    assert(!res.message?.includes("SECRET-KEY"));
  }
});

Deno.test("api-key: 429, 5xx and a missing key get distinct messages", async () => {
  const busy = mockCtx([{ status: 429, body: { message: "API key quota exceeded" } }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
