import { assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeaders: builds the bearer header", () => {
  assertEquals(authHeaders({ apiKey: "fc-abc123" }), { authorization: "Bearer fc-abc123" });
});

Deno.test("authHeaders: an absent key still produces a header shape (never throws)", () => {
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("sign: injects the Authorization header and returns the request", async () => {
  const request = { url: "https://api.firecrawl.dev/v2/scrape", method: "POST", headers: {} };
  const out = await apiKey.sign!({ request, credential: { apiKey: "fc-xyz" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "Bearer fc-xyz");
});

Deno.test("test: missing credential fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: probes /team/credit-usage", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { success: true, data: { remainingCredits: 1000, planCredits: 5000 } },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "fc-good" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), `/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer fc-good");
});

/**
 * The two 401 shapes Firecrawl actually returns, read from the response body
 * rather than the (identical) status code — see the module doc for why.
 */
Deno.test("test: distinguishes 'no credential reached' from 'credential rejected'", async () => {
  const noKey = mockCtx([{
    status: 401,
    body: errorBody(
      "This endpoint is not supported by the keyless free tier. Sign up for a free API key at " +
        "https://www.firecrawl.dev/signin for more endpoints, more usage, and higher rate limits.",
    ),
  }]);
  const noKeyResult = await apiKey.test({ credential: { apiKey: "whatever" } }, noKey.ctx);
  assertEquals(noKeyResult.ok, false);
  assertEquals(noKeyResult.message?.includes("did not reach the request"), true);

  const badKey = mockCtx([{ status: 401, body: errorBody("Unauthorized: Invalid token") }]);
  const badKeyResult = await apiKey.test({ credential: { apiKey: "fc-wrong" } }, badKey.ctx);
  assertEquals(badKeyResult.ok, false);
  assertEquals(badKeyResult.message?.includes("Firecrawl rejected the key"), true);
});

Deno.test("test: an unexpected status is reported verbatim, not guessed at", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("boom") }]);
  const result = await apiKey.test({ credential: { apiKey: "fc-x" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("500"), true);
});

Deno.test("apiKey: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
