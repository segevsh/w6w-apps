import { assert, assertEquals } from "@std/assert";
import type { HookContext, SignableRequest } from "@w6w/types";
import apiToken, {
  AUTH_FAILURE_BODIES,
  authHeaders,
  classifyAuthFailure,
  PROBE_PATH,
} from "../../auth/api-token.ts";
import { errorBody, gatewayError, mockCtx } from "../_helpers.ts";

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature";

function signable(): SignableRequest {
  return { method: "GET", url: "https://api.productboard.com/v2/entities", headers: {} };
}

Deno.test("auth: sign stamps the bearer header and nothing else", () => {
  const req = apiToken.sign!({ request: signable(), credential: { accessToken: TOKEN } }, {
    fetch: () => {
      throw new Error("sign must not reach the network");
    },
    log: () => {},
  } as unknown as HookContext) as SignableRequest;
  assertEquals(req.headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(Object.keys(req.headers), ["authorization"]);
});

Deno.test("auth: the token never appears in a URL", () => {
  const req = apiToken.sign!({ request: signable(), credential: { accessToken: TOKEN } }, {
    fetch: () => {
      throw new Error("no");
    },
    log: () => {},
  } as unknown as HookContext) as SignableRequest;
  assert(!req.url.includes(TOKEN));
  assert(!req.url.includes("token="));
});

Deno.test("auth: authHeaders is the one place the wire format is built", () => {
  assertEquals(authHeaders({ accessToken: "x" }), { authorization: "Bearer x" });
});

// --- the probe ---------------------------------------------------------------

Deno.test("auth: test probes /entities/configurations, which needs a token and returns no data", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const out = await apiToken.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].url, `https://api.productboard.com/v2${PROBE_PATH}`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

Deno.test("auth: a missing credential fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

// --- classification is from the BODY, never the status -----------------------

/**
 * All four of these were measured against api.productboard.com on 2026-08-11
 * and all four are HTTP 401. If the classifier keyed off the status it would
 * give the same answer to four different problems.
 */
Deno.test("auth: the four measured 401 bodies produce four different diagnoses", () => {
  const missing = classifyAuthFailure(401, gatewayError(AUTH_FAILURE_BODIES.missing));
  const notAJwt = classifyAuthFailure(401, gatewayError(AUTH_FAILURE_BODIES.notAJwt));
  const issuer = classifyAuthFailure(401, gatewayError(AUTH_FAILURE_BODIES.unknownIssuer));
  const bare = classifyAuthFailure(401, gatewayError("something else entirely"));

  assert(missing.includes("received no token"), missing);
  assert(notAJwt.includes("could not parse the token"), notAJwt);
  assert(issuer.includes("does not recognise the issuer"), issuer);
  assert(bare.includes("rejected the token"), bare);

  const all = [missing, notAJwt, issuer, bare];
  assertEquals(new Set(all).size, 4, "two 401 causes collapsed onto one message");
});

Deno.test("auth: a route.notFound says the app is stale, not that the token is bad", () => {
  const out = classifyAuthFailure(
    404,
    errorBody("route.notFound", "Route not found", "No such path."),
  );
  assert(out.includes("path"), out);
  assert(out.includes("not the problem"), out);
});

Deno.test("auth: a 403 is reported as a live token missing a scope", () => {
  const out = classifyAuthFailure(
    403,
    errorBody("auth.accessDenied", "Access denied", "Missing scope."),
  );
  assert(out.includes("live but lacks"), out);
  assert(out.includes("Missing scope."), out);
});

Deno.test("auth: an unreadable body still yields a status-bearing message", () => {
  const out = classifyAuthFailure(503, null);
  assert(out.includes("503"), out);
  assert(out.includes(PROBE_PATH), out);
});

Deno.test("auth: test routes a real 401 through the classifier", async () => {
  const { ctx } = mockCtx([{ status: 401, body: gatewayError(AUTH_FAILURE_BODIES.notAJwt) }]);
  const out = await apiToken.test({ credential: { accessToken: "not-a-jwt" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("could not parse the token"), out.message);
});

Deno.test("auth: no failure message ever echoes the credential", async () => {
  for (const body of Object.values(AUTH_FAILURE_BODIES)) {
    const { ctx } = mockCtx([{ status: 401, body: gatewayError(body) }]);
    const out = await apiToken.test({ credential: { accessToken: TOKEN } }, ctx);
    assert(!out.message!.includes(TOKEN), `${body}: message echoed the token`);
  }
});

Deno.test("auth: the method declares a secret field and both hooks", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.fields!.length, 1);
  assertEquals(apiToken.fields![0].type, "secret");
  assertEquals(typeof apiToken.test, "function");
  assertEquals(typeof apiToken.sign, "function");
});
