import { assert, assertEquals } from "@std/assert";
import workspace from "../../health/workspace.ts";
import { mockDatabricksCtx, WORKSPACE_URL } from "../_helpers.ts";

const PROBE_URL = `${WORKSPACE_URL}/api/2.0/preview/scim/v2/Me`;

/**
 * Every Connection points at a different workspace host, so this is
 * connection-scoped and needs the Connection for context — but not the
 * credential: `credential: "context"` is what keeps `sign` from running, which
 * is the whole point of an unauthenticated probe.
 */
Deno.test("workspace: connection-scoped dependency check that does not sign", () => {
  assertEquals(workspace.key, "workspace");
  assertEquals(workspace.kind, "dependency");
  assertEquals(workspace.scope, "connection");
  assertEquals(workspace.credential, "context");
  assertEquals(workspace.covers, ["*"]);
});

/**
 * A 401 is a PASS. The probe is unauthenticated, so an auth challenge proves the
 * host resolves and the API is answering — which is exactly what this check is
 * asking. Whether the credential is any good is the derived `auth:*` check's job.
 */
Deno.test("workspace: a 401 passes — it proves the workspace is serving", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ status: 401, body: { error_code: "UNAUTHORIZED" } }]);
  const report = await workspace.check!({}, ctx);

  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(report.state, "ok");
  // No credential is sent: the runtime must not have signed this request.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("workspace: a 200 passes and carries a TTL", async () => {
  const { ctx } = mockDatabricksCtx([{ body: { id: "42" } }]);
  const report = await workspace.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.ttlSeconds, 120);
});

/**
 * A 404 means the host answered but this workspace is not there — a wrong URL or
 * a deleted workspace, both of which the operator has to fix.
 */
Deno.test("workspace: a 404 is down, and names both causes", async () => {
  const { ctx } = mockDatabricksCtx([{ status: 404, body: "" }]);
  const report = await workspace.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("URL may be wrong"), report.message);
  assert(report.message!.includes("deleted"), report.message);
});

Deno.test("workspace: a 5xx is down and reports the status", async () => {
  for (const status of [500, 503]) {
    const { ctx } = mockDatabricksCtx([{ status, body: "" }]);
    const report = await workspace.check!({}, ctx);
    assertEquals(report.state, "down");
    assert(report.message!.includes(String(status)), report.message);
  }
});

/** Other 4xx answers still prove the host is serving, so they are not outages. */
Deno.test("workspace: a 403 is still a serving workspace", async () => {
  const { ctx } = mockDatabricksCtx([{ status: 403, body: "" }]);
  assertEquals((await workspace.check!({}, ctx)).state, "ok");
});

/**
 * A connection with no recorded host cannot be probed — that is unknown, not
 * down: nothing has been learned about the workspace.
 */
Deno.test("workspace: no recorded host is unknown, and makes no request", async () => {
  const { ctx, calls } = mockDatabricksCtx([], {});
  const report = await workspace.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no workspaceUrl"), report.message);
  assertEquals(calls.length, 0);
});
