import { assertEquals, assertNotEquals } from "@std/assert";
import accessToken, {
  authHeaders,
  describeTokenProblem,
  PROBE_PATH,
} from "../../auth/access-token.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "e72e16c7e42f292c6912e7710c123347ae178b4a";

function signed(url: string, credential: Record<string, unknown>): Record<string, unknown> {
  const request = { url, method: "GET", headers: {} as Record<string, string> };
  return accessToken.sign!({ request, credential }, mockCtx().ctx) as unknown as Record<
    string,
    unknown
  >;
}

Deno.test("access-token: declares a bearer method with a secret token and an environment choice", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  const fields = accessToken.fields!;
  assertEquals(fields[0].key, "accessToken");
  // A credential field that is not `secret` would be rendered in plain sight.
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  assertEquals(fields[1].key, "environment");
  assertEquals(fields[1].default, "live");
  assertEquals(fields[1].options, [
    { value: "live", label: "Live (api.gocardless.com)" },
    { value: "sandbox", label: "Sandbox (api-sandbox.gocardless.com)" },
  ]);
});

/**
 * GoCardless needs BOTH headers on every request: without `GoCardless-Version`
 * it answers `400 missing_version_header`. One builder, so a probe and a real
 * request cannot diverge.
 */
Deno.test("access-token: authHeaders stamps the bearer token AND the API version", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), {
    authorization: `Bearer ${TOKEN}`,
    "gocardless-version": "2015-07-06",
  });
});

Deno.test("access-token: sign stamps both headers", () => {
  const request = signed("https://api.gocardless.com/customers", {
    accessToken: TOKEN,
    environment: "live",
  });
  assertEquals(request.headers, {
    authorization: `Bearer ${TOKEN}`,
    "gocardless-version": "2015-07-06",
  });
});

Deno.test("access-token: sign leaves a live Connection on the live host", () => {
  const request = signed("https://api.gocardless.com/customers?limit=1", {
    accessToken: TOKEN,
    environment: "live",
  });
  assertEquals(request.url, "https://api.gocardless.com/customers?limit=1");
});

/**
 * The host rewrite is the GoCardless-specific replacement for Paddle's
 * key-derived host: the environment is a field, so `sign` is what points the
 * request at the right one.
 */
Deno.test("access-token: sign rewrites the hostname for a sandbox Connection", () => {
  const request = signed("https://api.gocardless.com/payments/PM1", {
    accessToken: TOKEN,
    environment: "sandbox",
  });
  assertEquals(request.url, "https://api-sandbox.gocardless.com/payments/PM1");
});

Deno.test("access-token: an absent environment defaults to live, not to `undefined`", () => {
  const request = signed("https://api.gocardless.com/customers", { accessToken: TOKEN });
  assertEquals(request.url, "https://api.gocardless.com/customers");
});

Deno.test("access-token: a malformed URL is left alone rather than redirected", () => {
  const request = signed("not a url", { accessToken: TOKEN, environment: "sandbox" });
  assertEquals(request.url, "not a url");
});

// --- test() -----------------------------------------------------------------

Deno.test("access-token: the probe is GET /creditors?limit=1 with both headers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { creditors: [] } }]);
  const out = await accessToken.test!(
    { credential: { accessToken: TOKEN, environment: "live" } },
    ctx,
  );

  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/creditors");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(calls[0].headers["gocardless-version"], "2015-07-06");
  // PROBE_PATH is the single source of the probe's own spelling.
  assertEquals(PROBE_PATH, "/creditors?limit=1");
});

Deno.test("access-token: a sandbox Connection probes the sandbox host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { creditors: [] } }]);
  await accessToken.test!(
    { credential: { accessToken: TOKEN, environment: "sandbox" } },
    ctx,
  );
  assertEquals(calls[0].url.startsWith("https://api-sandbox.gocardless.com/"), true, calls[0].url);
});

Deno.test("access-token: a missing token never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await accessToken.test!({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message, "credential missing accessToken");
  assertEquals(calls.length, 0);
});

Deno.test("access-token: a pasted Authorization header is named, not sent", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await accessToken.test!(
    { credential: { accessToken: `Bearer ${TOKEN}` } },
    ctx,
  );
  assertEquals(out.ok, false);
  assertEquals(/Authorization: Bearer/.test(out.message ?? ""), true, out.message);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: whitespace inside a token is caught before the wire", () => {
  assertEquals(describeTokenProblem(`${TOKEN}\n${TOKEN}`)?.includes("whitespace"), true);
  assertEquals(describeTokenProblem(TOKEN), undefined);
});

/**
 * Classification is by the response BODY — the vendor's own error code — never
 * by the status line. Every case below answers the same status where the vendor
 * documents the same status, and the messages differ.
 */
Deno.test("access-token: `unauthorized` reads as a rejected token, and never echoes it", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_usage", {
      code: 401,
      message: "Credentials not recognised",
      errors: [{ reason: "unauthorized", message: "Credentials not recognised" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("unauthorized"), true, out.message);
  assertEquals(out.message?.includes(TOKEN), false);
});

Deno.test("access-token: every access_token_* 401 reason is treated as a rejected token", async () => {
  for (
    const reason of ["access_token_not_found", "access_token_revoked", "access_token_not_active"]
  ) {
    const { ctx } = mockCtx([{
      status: 401,
      body: errorBody("invalid_api_usage", {
        code: 401,
        errors: [{ reason, message: "Credentials not recognised" }],
      }),
    }]);
    const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);
    assertEquals(out.ok, false, reason);
    // Exact vendor casing, not a case-insensitive guess.
    assertEquals(out.message?.includes(reason), true, out.message);
  }
});

Deno.test("access-token: a missing header is a different message from a bad token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_usage", {
      code: 401,
      errors: [{ reason: "missing_authorization_header", message: "No Authorization header" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("no Authorization header"), true, out.message);
  assertNotEquals(out.message?.includes("rejected the access token"), true);
});

Deno.test("access-token: a malformed Authorization header says so", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_usage", {
      code: 401,
      errors: [{ reason: "invalid_authorization_header", message: "Malformed header" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(out.message?.includes("could not parse"), true, out.message);
});

Deno.test("access-token: a version-header failure is reported as this app's fault", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("invalid_api_usage", {
      code: 400,
      errors: [{ reason: "missing_version_header", message: "GoCardless-Version header missing" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("not in your token"), true, out.message);
});

/**
 * A 403 is not a bad credential: GoCardless restricts some endpoints by account
 * state. Failing the Connection would send the user to re-paste a token that
 * works.
 */
Deno.test("access-token: a 403 is reported as connected-but-not-permitted", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("gocardless", {
      code: 403,
      errors: [{ reason: "forbidden", message: "Not permitted" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out.ok, true);
  assertEquals(out.message?.includes("403"), true, out.message);
});

Deno.test("access-token: a 429 does not fail the Connection either", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody("invalid_api_usage", {
      code: 429,
      errors: [{ reason: "rate_limit_exceeded", message: "Rate limit exceeded" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(out.ok, true);
  assertEquals(out.message?.includes("rate-limited"), true, out.message);
});

Deno.test("access-token: an unreadable body is admitted, not guessed at", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("no readable error code"), true, out.message);
});

Deno.test("access-token: a body-less failure is admitted too", async () => {
  const { ctx } = mockCtx([{ status: 503 }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("503"), true, out.message);
});

Deno.test("access-token: any other vendor code is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid_api_usage", {
      code: 422,
      message: "Something else",
      errors: [{ reason: "some_other_reason", message: "Something else" }],
    }),
  }]);
  const out = await accessToken.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(out.message?.includes("some_other_reason"), true, out.message);
});

Deno.test("access-token: afterConnect publishes the environment and host, and calls nothing", () => {
  assertEquals(
    accessToken.afterConnect!(
      { credential: { accessToken: TOKEN, environment: "sandbox" } },
      mockCtx().ctx,
    ),
    { environment: "sandbox", host: "api-sandbox.gocardless.com" },
  );
  assertEquals(
    accessToken.afterConnect!({ credential: { accessToken: TOKEN } }, mockCtx().ctx),
    { environment: "live", host: "api.gocardless.com" },
  );
});
