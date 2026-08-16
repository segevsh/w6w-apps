import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { componentKey, mapComponentStatus, STATUS_URL } from "../../health/service.ts";

const COMPONENTS = (overrides: Partial<{ status: string }> = {}) => ({
  components: [
    { id: "webapp", name: "WebApp", status: "OPERATIONAL", group: null },
    { id: "gmeet", name: "Google-Meet Assistant Recorder", status: "OPERATIONAL", group: null },
    { id: "zoom", name: "Zoom Assistant Recorder", status: "OPERATIONAL", group: null },
    {
      id: "teams",
      name: "Microsoft Teams Assistant Recorder (beta)",
      status: "OPERATIONAL",
      group: null,
    },
    { id: "api", name: "Public API", status: overrides.status ?? "OPERATIONAL", group: null },
    { id: "webhooks", name: "Webhooks & integrations", status: "OPERATIONAL", group: null },
    { id: "notes", name: "AI notes", status: "OPERATIONAL", group: null },
    { id: "reports", name: "AI reports", status: "OPERATIONAL", group: null },
  ],
});

Deno.test("service: hits the Instatus components endpoint, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: COMPONENTS() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("service: ok when the Public API component is operational", async () => {
  const { ctx } = mockCtx([{ body: COMPONENTS() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "ok");
});

Deno.test("service: an unrelated component outage does not move the verdict", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        { id: "webapp", name: "WebApp", status: "MAJOROUTAGE", group: null },
        { id: "api", name: "Public API", status: "OPERATIONAL", group: null },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message?.includes("WebApp"), true);
});

Deno.test("service: a Public API outage IS the verdict", async () => {
  const { ctx } = mockCtx([{ body: COMPONENTS({ status: "MAJOROUTAGE" }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: the Public API component going missing is unknown, not silently ignored", async () => {
  const { ctx } = mockCtx([{
    body: { components: [{ id: "webapp", name: "WebApp", status: "OPERATIONAL" }] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("Public API"), true);
});

Deno.test("mapComponentStatus: the documented Instatus vocabulary", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("MINOROUTAGE"), "degraded");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus("SOMETHING-NEW"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "Public API" }, 0), "abc123");
  assertEquals(componentKey({ name: "Public API" }, 4), "public-api-4");
  assertEquals(componentKey({}, 2), "component-2");
});

Deno.test("service: annotation matches a vendor-status check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["tldv.instatus.com"] });
});
