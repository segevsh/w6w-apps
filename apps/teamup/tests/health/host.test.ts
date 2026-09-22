import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import host, { HOST_PROBE_PATH } from "../../health/host.ts";

const unauthorized = {
  code: "authentication_failed",
  field_errors: {},
  message: "Authentication credentials were not provided.",
  type: "invalid_request_error",
};

/** The probe is reachability, so it must not carry the credential. */
Deno.test("host: probes the documented API path unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: unauthorized }]);
  const result = await host.check!({}, ctx);
  assertEquals(calls[0].url, "https://goteamup.com/api/v2/auth/profiles");
  assertEquals(HOST_PROBE_PATH, "/api/v2/auth/profiles");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  assertEquals(result.state, "ok");
  assert(/the API is serving/.test(result.message!), result.message);
  assert(/authentication_failed/.test(result.message!), result.message);
});

/** A credential gate answering is the whole question this check asks. */
Deno.test("host: a 401 and a 403 are both a pass", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: { code: "permission_denied", message: "nope" } }]);
    assertEquals((await host.check!({}, ctx)).state, "ok");
  }
  const { ctx } = mockCtx([{ status: 401, body: "<html>gateway</html>" }]);
  // A non-JSON body still counts: it is the status that says "the host answered".
  assertEquals((await host.check!({}, ctx)).state, "ok");
});

Deno.test("host: a 200 is ok and reports the latency", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  const result = await host.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(typeof result.latencyMs, "number");
});

/** A 404 means something answered, but not the documented API. */
Deno.test("host: a 404 is degraded, not ok and not down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "<html>not found</html>" }]);
  const result = await host.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/documented API path/.test(result.message!), result.message);
});

Deno.test("host: a 5xx or an unreachable host is down", async () => {
  for (const status of [500, 503]) {
    const { ctx } = mockCtx([{ status, body: { code: "server_error", message: "boom" } }]);
    assertEquals((await host.check!({}, ctx)).state, "down");
  }
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof host.check>>[1];
  const result = await host.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/could not reach https:\/\/goteamup.com/.test(result.message!), result.message);
});

Deno.test("host: is an informational app-scoped dependency check on the API host", () => {
  assertEquals(host.key, "host");
  assertEquals(host.kind, "dependency");
  assertEquals(host.scope, "app");
  assertEquals(host.credential, "none");
  assertEquals(host.covers, ["*"]);
  assertEquals(host.network?.allow, ["goteamup.com"]);
});

/**
 * The status page is abandoned, so there must be no `service` check pointing at
 * it — and the reason has to be written down where a host can read it.
 */
Deno.test("host: documents why there is no `service` check against the status page", () => {
  assertEquals(host.severity, "informational");
  const description = host.description ?? "";
  assert(/status page/.test(description), description);
  assert(/abandoned/.test(description), description);
  assert(/credential validity is the `auth:token` check/.test(description), description);
});
