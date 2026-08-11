import { assert, assertEquals } from "@std/assert";
import api, { API_PROBE_URL } from "../../health/api.ts";
import { mockCtx, UNAUTHORIZED_BODY } from "../_helpers.ts";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

Deno.test("api: probes the app's own host unsigned, widening nothing", () => {
  assertEquals(API_PROBE_URL, "https://secure.splitwise.com/api/v3.0/get_current_user");
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  // secure.splitwise.com is already the app's egress host — there is nothing to
  // widen, and the spec forbids widening from a signed posture anyway.
  assertEquals(api.network, undefined);
});

/**
 * The whole point: the probe carries no credential, so a 401 is the PASS. It
 * proves DNS, TLS, the edge, the v3.0 router and the auth filter all worked.
 * Judging by the status code would report Splitwise permanently down.
 */
Deno.test("api: the documented JSON 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: UNAUTHORIZED_BODY,
    headers: JSON_HEADERS,
  }]);
  const report = await api.check!({}, ctx);

  assertEquals(calls[0].url, API_PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(report.state, "ok");
  assert(/documented JSON 401/.test(report.message ?? ""), report.message);
});

Deno.test("api: a 401 that is not the documented body is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Sign in</html>", headers: HTML_HEADERS }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/not the documented JSON body/.test(report.message ?? ""), report.message);
});

/**
 * Measured: `/api/v1.0/…`, `/api/v2.0/…`, `/api/v3.1/…` and a nonsense path all
 * return the site's 3,085-byte HTML 404. If v3.0 ever answers that, the version
 * this app is written against is gone and every action is dead.
 */
Deno.test("api: an HTML 404 means the version was withdrawn — down", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "<!DOCTYPE html><title>Splitwise :: 404 Error</title>",
    headers: HTML_HEADERS,
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/has been withdrawn/.test(report.message ?? ""), report.message);
});

/**
 * `/api/v4.0/…` answers `{"errors":[{"status":"404",…}]}` for every path
 * including nonsense ones — a routed-but-empty namespace. The distinction from
 * the HTML 404 is what tells you a rewrite happened rather than a route being
 * dropped.
 */
Deno.test("api: a JSON 404 is reported as a routed-but-gone endpoint", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ status: "404", title: "Not Found" }] },
    headers: JSON_HEADERS,
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(
    /the namespace routes but the endpoint is gone/.test(report.message ?? ""),
    report.message,
  );
});

/**
 * A 200 here means the whoami stopped requiring a credential — which is what
 * the auth probe depends on. That is an anomaly to surface, not health.
 */
Deno.test("api: an unauthenticated 200 is degraded, and says why", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { user: { id: 1 } }, headers: JSON_HEADERS }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/stopped requiring a credential/.test(report.message ?? ""), report.message);
});

Deno.test("api: 5xx is down, 429 is degraded", async () => {
  const down = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");

  const limited = mockCtx([{ status: 429, body: {} }]);
  const report = await api.check!({}, limited.ctx);
  assertEquals(report.state, "degraded");
  assert(/429/.test(report.message ?? ""), report.message);
});

Deno.test("api: an unexpected status is unknown, never invented", async () => {
  const { ctx } = mockCtx([{ status: 402, body: {} }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});
