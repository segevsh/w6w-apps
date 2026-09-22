import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { API_ROOT, mockCtx, problem } from "../_helpers.ts";

const CREDENTIAL = { apiKey: "st-token-abc123" };

// --- the wire format --------------------------------------------------------

/**
 * The `Bearer ` prefix is load-bearing: the spec declares a plain `apiKey`
 * scheme, but a token sent without the scheme is rejected as an INVALID token,
 * which reads as "your key is wrong" rather than "your header is wrong".
 */
Deno.test("api-key: sign stamps an Authorization header with the Bearer scheme", () => {
  const request = {
    url: "https://api-app2.simpletexting.com/v2/api/tenant",
    method: "GET",
    headers: {},
  };
  const signed = apiKey.sign!({ request, credential: CREDENTIAL }, {} as HookContext) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["authorization"], "Bearer st-token-abc123");
  assertEquals(authHeaders(CREDENTIAL)["authorization"], "Bearer st-token-abc123");
  // The token never appears in a URL, so it cannot land in a request log.
  assertEquals(signed.url.includes("st-token-abc123"), false);
});

Deno.test("api-key: declares the apiKey scheme the document declares, header and prefix", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  for (const field of apiKey.fields ?? []) {
    assertEquals(field.type, "secret", `${field.key} must be a secret`);
  }
  assertEquals(typeof apiKey.test, "function");
});

// --- the probe --------------------------------------------------------------

Deno.test("api-key: the probe is the tenant endpoint, with no parameters", () => {
  assertEquals(PROBE_PATH, "/api/tenant");
});

Deno.test("api-key: a 200 with a TenantInfo object is a live credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { email: "owner@example.com" } }]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);

  assertEquals(result.ok, true);
  assertEquals(calls[0].url, `${API_ROOT}${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer st-token-abc123");
});

/**
 * HTTP 200 is not the answer: the endpoint has to answer its documented shape.
 */
Deno.test("api-key: a 200 without a JSON object is not treated as a live credential", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>hello</html>" }]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("TenantInfo"), result.message);
});

/**
 * Both credential failures are HTTP 401, so the body's `errorCode` is the only
 * thing that separates them — verified live on 2026-09-22. The messages must not
 * be interchangeable: one means "reconnect", the other "re-mint".
 */
Deno.test("api-key: 401 ERR_AUTH_TOKEN_INVALID is a rejected token", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: problem("ERR_AUTH_TOKEN_INVALID", "Tenant not found for provided token"),
    },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("ERR_AUTH_TOKEN_INVALID"), result.message);
  assert(result.message!.includes("rejected"), result.message);
});

Deno.test("api-key: 401 ERR_AUTH_TOKEN_MISSING is a credential that never arrived", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: problem("ERR_AUTH_TOKEN_MISSING", "Auth token is missing") },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("ERR_AUTH_TOKEN_MISSING"), result.message);
  assert(result.message!.includes("reconnect"), result.message);
});

/** An unrecognised 401 body is still a credential statement, not an outage. */
Deno.test("api-key: an undocumented 401 body is reported as a credential rejection", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>401</html>" }]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("401"), result.message);
  assert(result.message!.includes("rejected"), result.message);
});

/** A server error says nothing about the credential, and the message must not pretend otherwise. */
Deno.test("api-key: a 5xx is reported as a status, not as a bad token", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "<html>maintenance</html>" }]);
  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
  assert(result.message!.includes("rejected") === false, result.message);
});

/** The network-less signer and the network caller are the same credential, in one place. */
Deno.test("api-key: the probe never echoes the credential back", async () => {
  const secret = "st-super-secret-value";
  const { ctx } = mockCtx([
    { status: 401, body: problem("ERR_AUTH_TOKEN_INVALID", "Tenant not found for provided token") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: secret } }, ctx);
  assert(!result.message!.includes(secret), "the credential leaked into the result message");

  const { ctx: okCtx, calls } = mockCtx([{ status: 200, body: { email: "owner@example.com" } }]);
  await apiKey.test({ credential: { apiKey: secret } }, okCtx);
  assert(!calls[0].url.includes(secret), "the credential leaked into the request URL");
});

Deno.test("api-key: an unreachable host is not a statement about the credential", async () => {
  let fetched = false;
  const ctx = {
    fetch: () => {
      fetched = true;
      return Promise.reject(new Error("connect ECONNREFUSED"));
    },
    log: () => {},
  } as unknown as HookContext;

  const result = await apiKey.test({ credential: CREDENTIAL }, ctx);
  assertEquals(fetched, true);
  assertEquals(result.ok, false);
  assert(result.message!.includes("not a statement about the credential"), result.message);
});

Deno.test("api-key: a missing token is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "  " } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("apiKey"), result.message);
  assertEquals(calls.length, 0);
});
