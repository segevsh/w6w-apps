import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import api, { HEALTH_URL } from "../../health/api.ts";

Deno.test("api: hits the dedicated /v1alpha1/health route, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  await api.check!({}, ctx);
  assertEquals(calls[0].url, HEALTH_URL);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test('api: {"status":"ok"} is ok', async () => {
  const { ctx } = mockCtx([{ body: { status: "ok" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("api: an unexpected status string is degraded, not assumed healthy", async () => {
  const { ctx } = mockCtx([{ body: { status: "degraded" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("api: a 429 is degraded — rate-limited is alive", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("api: a 200 with no readable status field is unknown", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("api: annotation — unsigned, app-scoped, no extra egress to declare", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
});
