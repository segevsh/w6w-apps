import { assert, assertEquals } from "@std/assert";
import credential from "../../health/credential.ts";
import { PROBE_URL } from "../../auth/api-token.ts";
import { mockCtx, pathOf, unauthorisedResponse } from "../_helpers.ts";

Deno.test("credential: it is a signed, connection-scoped credential probe", () => {
  assertEquals(credential.key, "credential");
  assertEquals(credential.kind, "credential");
  assertEquals(credential.scope, "connection");
  assertEquals(credential.credential, "signed");
  // A signed check may not widen egress — the validator enforces it, so the
  // allowlist here is the app's own (`api.streamtime.net`).
  assertEquals(credential.network, undefined);
  assertEquals(credential.covers, ["credential"]);
});

Deno.test("credential: a live token reports the organisation and stays ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Acme Ltd", domain: "acme" } }]);
  const report = await credential.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/organisation");
  assertEquals(calls[0].url, PROBE_URL);
  // The check never signs: the host's `sign` hook does.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(report.state, "ok");
  assertEquals(report.message, 'organisation "Acme Ltd"');
});

/**
 * The vendor's rejection body is the only signal Streamtime gives, and it is the
 * same for a missing token, a revoked token and an unknown path.
 */
Deno.test("credential: the vendor's rejection body is down, and says why", async () => {
  const { ctx } = mockCtx([unauthorisedResponse()]);
  const report = await credential.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(report.message?.includes("You are not authorised to make this request"), report.message);
});

/** A 401 whose body is not the vendor's is not something this app can read. */
Deno.test("credential: an unrecognised 401 is unknown, never a dead token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "<html>gateway</html>", headers: { "content-type": "text/html" } },
  ]);
  const report = await credential.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("does not recognise"), report.message);
});

Deno.test("credential: a 5xx says nothing about the credential", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "maintenance" }]);
  const report = await credential.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("credential: a transport failure is unknown with a reachable message", async () => {
  const { ctx } = mockCtx([]);
  const report = await credential.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/could not reach/.test(report.message ?? ""), report.message);
});
