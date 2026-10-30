import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service, { EXPECTED_STATUS } from "../../health/service.ts";
import { errorEnvelope, hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("service: is an informational, unsigned, app-scoped service check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  // SEMrush publishes no reachable status page, so this check must never pin a
  // roll-up verdict of its own accord.
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.check, "function");
});

test("service: probes api.semrush.com with no credential at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: errorEnvelope(401, "Unauthorized") }]);

  await service.check!({}, ctx);

  assertEquals(hostOf(calls[0].url), "api.semrush.com");
  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/overview");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("service: a schema-correct 401 error envelope is a PASS", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(401, "Unauthorized") }]);

  const report = await service.check!({}, ctx);

  assertEquals(EXPECTED_STATUS, 401);
  assertEquals(report.state, "ok");
});

test("service: a 5xx is unknown, never down — there is no status feed to corroborate", async () => {
  const { ctx } = mockCtx([{ status: 503, body: errorEnvelope(503, "Service Unavailable") }]);

  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
});

test("service: a non-JSON body is unknown", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);

  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
});

test("service: JSON that is not the documented error envelope is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);

  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no readable error envelope"));
});

test("service: a transport failure is unknown, and no probe answer is ever `down`", async () => {
  const { ctx } = mockCtx([]);

  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(
    ["ok", "unknown"].includes(report.state),
    "this check must never report `down`: there is no status page to confirm an outage",
  );
});
