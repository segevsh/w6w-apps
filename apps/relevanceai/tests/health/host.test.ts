import { assert, assertEquals } from "@std/assert";
import host from "../../health/host.ts";
import { errorBody, mockRelevanceCtx } from "../_helpers.ts";

/**
 * The region host is the one piece of configuration no vendor lookup can
 * complete for the user, and a mistyped region id otherwise fails as "Relevance
 * AI rejected the key" — the wrong diagnosis. This check separates the two.
 */
Deno.test("host: is a per-connection dependency that needs the Connection but no credential", () => {
  assertEquals(host.kind, "dependency");
  assertEquals(host.scope, "connection");
  assertEquals(host.credential, "context");
  // `*.stack.tryrelevance.com` is already on the app's allowlist, and a
  // `context` check is unsigned regardless.
  assertEquals(host.network?.allow, undefined);
  // Left at the kind's own default (`degraded`) — this one is a live probe, so
  // it has no declared absence to keep from pinning the verdict.
  assertEquals(host.severity, undefined);
});

Deno.test("host: probes this connection's own region host, unauthenticated", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    {
      status: 401,
      body: errorBody(
        "authorization_header_missing",
        "Authorization header cannot be missing or empty",
      ),
    },
  ]);
  const report = await host.check!({}, ctx);

  assertEquals(calls[0].url, "https://api-f1db6c.stack.tryrelevance.com/latest/auth/info");
  // A 401 passes: it proves DNS, TLS and the vendor's API are all answering,
  // which is the entire question. Credential validity is `auth:*`'s job.
  assertEquals(report.state, "ok");
  // The credential is never sent by this check, which is why `credential` is
  // `context` and not `signed`.
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("host: a different Connection probes a different host", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: {} }], "0e489e");
  await host.check!({}, ctx);
  assertEquals(calls[0].url, "https://api-0e489e.stack.tryrelevance.com/latest/auth/info");
});

Deno.test("host: a connection with no region id cannot be probed", async () => {
  const { ctx, calls } = mockRelevanceCtx();
  (ctx as unknown as { connection: { display: Record<string, unknown> } }).connection.display = {};
  const report = await host.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});

Deno.test("host: a 404 means the region id belongs to no gateway", async () => {
  const { ctx } = mockRelevanceCtx([{ status: 404, body: {} }]);
  const report = await host.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/f1db6c/.test(report.message ?? ""), report.message);
});

Deno.test("host: a 5xx is down", async () => {
  const { ctx } = mockRelevanceCtx([{ status: 503, body: "" }]);
  assertEquals((await host.check!({}, ctx)).state, "down");
});

Deno.test("host: an unreachable host is down, and names the region id", async () => {
  // No queued response, so the request throws — DNS failure, in effect.
  const { ctx } = mockRelevanceCtx([], "zzzzzz");
  const report = await host.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/zzzzzz/.test(report.message ?? ""), report.message);
  assert(/region id/.test(report.message ?? ""), report.message);
});
