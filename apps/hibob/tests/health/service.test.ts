import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  PUBLIC_API_COMPONENT_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(apiStatus: string, over: Record<string, unknown> = {}) {
  return {
    page: { id: "4427wk0x9t9k", name: "HiBob", url: "https://status.hibob.io" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "56kc59xy6k7c", name: "Core HR", status: "operational", group: true },
      { id: "dkyg3qmt1zvm", name: "US Payroll", status: "major_outage", group: false },
      { id: PUBLIC_API_COMPONENT_ID, name: "Public API", status: apiStatus, group: false },
    ],
    incidents: [],
    ...over,
  };
}

Deno.test("service: judges the Public API component, not other components or the roll-up", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok"); // US Payroll is in major_outage and must not leak in
});

Deno.test("service: partial and major outage of the Public API map to degraded / down", async () => {
  const { ctx } = mockCtx([{ body: summary("partial_outage") }, { body: summary("major_outage") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "degraded");
  assertEquals((await service.check!({} as never, ctx)).state, "down");
});

Deno.test("service: a different page identity, missing component or bad body is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary("operational", { page: { id: "other", name: "Someone Else" } }) },
    { body: summary("operational", { components: [] }) },
    { body: "<html>shell</html>", headers: { "content-type": "text/html" } },
    { status: 503 },
  ]);
  for (let i = 0; i < 4; i++) {
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});

Deno.test("service: declares its own status host and no credential", () => {
  assertEquals(service.network, { allow: ["status.hibob.io"] });
  assertEquals(service.credential, "none");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("???"), "unknown");
});
