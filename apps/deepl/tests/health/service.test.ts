import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: ok when overall is operational and all incidents are resolved", async () => {
  const { ctx } = mockCtx([{
    body: {
      overall: "operational",
      datacenters: [{ name: "europe", status: "operational" }],
      incidents: [{ id: "1", title: "old thing", status: "resolved" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.europe.state, "ok");
});

Deno.test("service: degraded when an incident is still open", async () => {
  const { ctx } = mockCtx([{
    body: {
      overall: "operational",
      datacenters: [{ name: "europe", status: "operational" }],
      incidents: [{ id: "1", title: "Elevated errors", status: "investigating" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Elevated errors");
});

Deno.test("service: down when a datacenter reports an outage", async () => {
  const { ctx } = mockCtx([{
    body: {
      overall: "major_outage",
      datacenters: [{ name: "americas", status: "major_outage" }],
      incidents: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.americas.state, "down");
});

Deno.test("service: unknown (never down) on a non-2xx status API response", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown on an unrecognized status token rather than guessing", async () => {
  const { ctx } = mockCtx([{
    body: { overall: "something-new", datacenters: [], incidents: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares its own network.allow for the status host, unsigned", () => {
  assertEquals(service.network?.allow, ["api-status.deepl.com"]);
  assertEquals(service.credential, undefined); // defaults to "none" for kind:"service"
});
