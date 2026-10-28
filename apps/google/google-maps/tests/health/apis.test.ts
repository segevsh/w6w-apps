import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apis, { PROBES, readLegacy, readRpc } from "../../health/apis.ts";

/** The probe deliberately sends an unanswerable request; a complaint is the good outcome. */
const legacyEnabled = { status: 200, body: { status: "INVALID_REQUEST", results: [] } };
const legacyDenied = {
  status: 200,
  body: { status: "REQUEST_DENIED", error_message: "This API project is not authorized" },
};
const rpcEnabled = {
  status: 400,
  body: {
    error: { code: 400, message: "textQuery must be non-empty", status: "INVALID_ARGUMENT" },
  },
};
const rpcDisabled = {
  status: 403,
  body: {
    error: {
      code: 403,
      message: "Places API has not been used in project 1 before or it is disabled.",
      details: [{ reason: "SERVICE_DISABLED" }],
    },
  },
};
const rpcBadKey = {
  status: 400,
  body: {
    error: {
      code: 400,
      message: "API key not valid. Please pass a valid API key.",
      details: [{ reason: "API_KEY_INVALID" }],
    },
  },
};

/**
 * The inversion worth stating: "the API told me my request was wrong" means the
 * API is switched on and answering. That is the healthy result here.
 */
Deno.test("apis: a complaint about the request means the API is enabled", async () => {
  const { ctx, calls } = mockCtx([
    legacyEnabled,
    legacyEnabled,
    rpcEnabled,
    rpcEnabled,
    rpcEnabled,
  ]);
  const result = await apis.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(calls.length, PROBES.length);
  for (const probe of PROBES) assertEquals(result.components![probe.key].state, "ok");
});

/** The failure this check exists for: one API off while everything else works. */
Deno.test("apis: one disabled API is degraded, and names it", async () => {
  const { ctx } = mockCtx([legacyEnabled, legacyEnabled, rpcDisabled, rpcEnabled, rpcEnabled]);
  const result = await apis.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["places"].state, "down");
  assert(/Places API \(New\)/.test(result.message!), result.message);
});

/** A connection that only geocodes is healthy with Places off. */
Deno.test("apis: a partially-enabled key is never reported as down", async () => {
  const { ctx } = mockCtx([legacyEnabled, legacyDenied, rpcDisabled, rpcDisabled, rpcDisabled]);
  assertEquals((await apis.check!({}, ctx)).state, "degraded");
});

Deno.test("apis: everything refused means the key itself is the problem", async () => {
  const { ctx } = mockCtx([legacyDenied, legacyDenied, rpcBadKey, rpcBadKey, rpcBadKey]);
  const result = await apis.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/HTTP referrers/.test(result.message!), result.message);
  assert(/billing/.test(result.message!), result.message);
});

Deno.test("apis: an unreachable probe is unknown rather than a false negative", async () => {
  let call = 0;
  const ctx = {
    fetch: () => {
      call++;
      if (call === 3) return Promise.reject(new Error("dns"));
      return Promise.resolve(
        new Response(JSON.stringify({ status: "INVALID_REQUEST" }), {
          status: call <= 2 ? 200 : 400,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof apis.check>>[1];
  const result = await apis.check!({}, ctx);
  assertEquals(result.components!["places"].state, "unknown");
  assertEquals(result.state, "unknown");
});

Deno.test("apis: the legacy vocabulary maps enablement, not correctness", () => {
  assertEquals(readLegacy("REQUEST_DENIED", "no"), "down");
  assertEquals(readLegacy("INVALID_REQUEST", ""), "ok");
  assertEquals(readLegacy("OK", ""), "ok");
  assertEquals(readLegacy("ZERO_RESULTS", ""), "ok");
  assertEquals(readLegacy("OVER_QUERY_LIMIT", ""), "degraded");
  assertEquals(readLegacy(undefined, ""), "unknown");
});

Deno.test("apis: the RPC vocabulary separates disabled from refused from complaining", () => {
  assertEquals(readRpc(403, "…is disabled.", "SERVICE_DISABLED"), "down");
  assertEquals(readRpc(400, "API key not valid.", "API_KEY_INVALID"), "down");
  assertEquals(readRpc(403, "Requests from referer <empty> are blocked.", undefined), "down");
  assertEquals(readRpc(400, "textQuery must be non-empty", undefined), "ok");
  assertEquals(readRpc(429, "quota", undefined), "degraded");
  assertEquals(readRpc(500, "boom", undefined), "unknown");
});

/** Enablement changes when a person clicks a button, not minute to minute. */
Deno.test("apis: is signed, informational, and does not run often", () => {
  assertEquals(apis.credential, "signed");
  assertEquals(apis.scope, "connection");
  assertEquals(apis.severity, "informational");
  assertEquals(apis.minIntervalSeconds, 900);
});

Deno.test("apis: every probe asks a question with a required parameter missing", () => {
  assertEquals(PROBES.length, 5);
  for (const probe of PROBES) {
    if (probe.method === "POST") assertEquals(probe.body, {});
    assert(!probe.url.includes("?"), `${probe.key} sends parameters: ${probe.url}`);
  }
});
