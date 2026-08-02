import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: ok + per-component detail when the page and all components are operational", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { page: { state: "operational", state_text: "All systems are go!" } } },
    {
      status: 200,
      body: [{ name: "API", state: "operational" }, { name: "SMTP", state: "operational" }],
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All systems are go!");
  assertEquals(report.components, {
    api: { state: "ok" },
    smtp: { state: "ok" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "status.postmarkapp.com");
  assertEquals(url.pathname, "/api/v1/status");
});

Deno.test("service: degraded when the page reports degraded or under_maintenance", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { state: "degraded" } } },
    { status: 200, body: [] },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: unknown (not down) when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown for an unrecognized page state", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { state: "something_new" } } },
    { status: 200, body: [] },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
