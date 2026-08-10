import { assert, assertEquals } from "@std/assert";
import instance from "../../health/instance.ts";
import { mockMetabaseCtx, SITE_URL } from "../_helpers.ts";

Deno.test("instance: probes /api/health unauthenticated on the connection's own host", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ status: 200, body: { status: "ok" } }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, `${SITE_URL}/api/health`);
  assertEquals(calls[0].method, "GET");
  // A `context` check is unsigned by construction, and /api/health is
  // unauthenticated by design — sending a key here would be gratuitous.
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/**
 * The 503 branch, captured on the wire by restarting a real container and
 * polling: `{"status":"initializing","progress":0.2}` … `0.95`.
 *
 * It is `degraded`, not `down`, because it is a container that has not finished
 * booting — transient by construction. Reporting a rolling restart as an outage
 * is how a health check trains people to ignore it.
 */
Deno.test("instance: a booting Metabase is degraded with its progress, not down", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 503,
    body: { status: "initializing", progress: 0.4 },
  }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("starting up"));
  assert(report.message!.includes("40%"), "the progress fraction is worth showing");
});

/**
 * The other 503, from the same handler: the app-db branch. Metabase is serving
 * but cannot reach its own application database, which is a real outage.
 */
Deno.test("instance: a 503 that is not 'initializing' is down", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 503,
    body: { status: "Unable to get app-db connection" },
  }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("app-db"));
});

Deno.test("instance: a 404 means this URL is not a Metabase", async () => {
  const { ctx } = mockMetabaseCtx([{ status: 404, body: "not found" }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("not routed"));
});

/**
 * A gate in FRONT of Metabase (SSO proxy, WAF, basic auth) can 401 an endpoint
 * Metabase itself leaves open. The instance may be perfectly healthy — this
 * check simply cannot see it, and `unknown` is the honest answer.
 */
Deno.test("instance: a 401/403 in front of Metabase is unknown, not down", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockMetabaseCtx([{ status, body: "denied" }]);
    const report = await instance.check!({}, ctx);
    assertEquals(report.state, "unknown", `status ${status}`);
    assert(report.message!.includes("gating"));
  }
});

Deno.test("instance: a 500 is down", async () => {
  const { ctx } = mockMetabaseCtx([{ status: 500, body: "boom" }]);
  assertEquals((await instance.check!({}, ctx)).state, "down");
});

/**
 * The parked-page case. Something answered 200 on this origin, but it is not
 * Metabase's health payload — so it is not evidence the instance is up.
 */
Deno.test("instance: a 200 that is not the health payload is degraded, not ok", async () => {
  const { ctx } = mockMetabaseCtx([{
    status: 200,
    body: "<html>Coming soon</html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("did not return Metabase's health payload"));
});

/**
 * Connection refused / DNS failure / TLS error. The runtime's default for a
 * throwing hook is `unknown`, which would make this check silent in the single
 * most common way for a Metabase to be down. It is caught and reported as
 * `down` instead. Verified against a closed port on a live run.
 */
Deno.test("instance: an unreachable host is down, not a swallowed exception", async () => {
  const { ctx } = mockMetabaseCtx([]);
  (ctx as { fetch: unknown }).fetch = () => {
    return Promise.reject(new TypeError("tcp connect error: Connection refused (os error 111)"));
  };
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("cannot reach metabase.example.com"));
  assert(report.message!.includes("Connection refused"));
});

Deno.test("instance: no site URL on the connection is unknown, and makes no call", async () => {
  const { ctx, calls } = mockMetabaseCtx([]);
  (ctx as { connection?: unknown }).connection = { display: {} };
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
});
