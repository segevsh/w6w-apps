import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: unsigned app-scoped check, widening egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.kit.com"]);
  assert(!service.network?.allow?.includes("api.kit.com"));
});

Deno.test("service: maps an all-clear rollup to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "API", status: "operational" },
        { name: "Email sending", status: "operational" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.kit.com/api/v2/summary.json");
  assertEquals(out.state, "ok");
  assertEquals(out.message, "All Systems Operational");
  assertEquals(out.components, {
    "api": { state: "ok" },
    "email-sending": { state: "ok" },
  });
});

Deno.test("service: maps minor to degraded and major/critical to down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([{ body: { status: { indicator }, components: [] } }]);
    assertEquals((await service.check!({} as never, ctx)).state, state, indicator);
  }
});

Deno.test("service: maps each component status onto a health state", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor" },
      components: [
        { name: "API", status: "degraded_performance" },
        { name: "Email sending", status: "major_outage" },
        { name: "Application", status: "under_maintenance" },
        { name: "Integrations", status: "something_new" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.components, {
    "api": { state: "degraded" },
    "email-sending": { state: "down" },
    "application": { state: "degraded" },
    "integrations": { state: "unknown" },
  });
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [
        { name: "Platform", status: "operational", group: true },
        { name: "API", status: "operational" },
      ],
    },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(Object.keys(out.components ?? {}), ["api"]);
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"));
});

Deno.test("service: an unrecognised indicator reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "wat" }, components: [] } }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});
