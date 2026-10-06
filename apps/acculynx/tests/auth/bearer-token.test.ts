import { assert, assertEquals } from "@std/assert";
import bearerToken, { authHeaders, PROBE_PATH } from "../../auth/bearer-token.ts";
import { mockCtx, pathOf, problemBody } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealApiKey00000";

Deno.test("bearer-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.acculynx.com/api/v2/jobs",
    headers: {} as Record<string, string>,
  };
  const signed = bearerToken.sign!({ request, credential: { apiKey: TOKEN } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers, { authorization: `Bearer ${TOKEN}` });
  assertEquals(authHeaders({ apiKey: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

/** /diagnostics/ping answers 200 with no key at all, so it can prove nothing about a credential. */
Deno.test("bearer-token: the probe is company-settings, never the unauthenticated ping", () => {
  assertEquals(PROBE_PATH, "/company-settings");
});

Deno.test("bearer-token: test passes when the probe answers, and sends the key", async () => {
  const { ctx, calls } = mockCtx([{ body: { companyId: "co1", name: "Acme" } }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/company-settings");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("bearer-token: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("bearer-token: a rejected key is recognised by the vendor's body title", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "application/problem+json" },
    body: problemBody(401, "API Key is invalid or deactivated.", "Unauthorized"),
  }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("rejected the API key"));
  assert(!result.message!.includes(TOKEN));
});

Deno.test("bearer-token: a 401 that is not the vendor's body is reported as unexpected", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Access denied</html>" }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(!result.message!.includes("rejected the API key"));
  assert(result.message!.includes("HTTP 401"));
});

Deno.test("bearer-token: a 429 proves the key was accepted", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "text/plain", "retry-after": "60" },
    body: "Hourly rate limit exceeded. Please try again later.",
  }]);
  assertEquals(await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx), { ok: true });
});

Deno.test("bearer-token: a 403 is a permissions problem, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: problemBody(403, "Forbidden") }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("refused"));
});
