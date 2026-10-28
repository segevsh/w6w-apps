import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("health/service: maps 'none' indicator to ok and hits the status host, unsigned", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "www.linkedin-apistatus.com");
  assertEquals(url.pathname, "/api/v2/summary.json");
});

Deno.test("health/service: maps 'major' indicator to down and folds per-component detail", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "major", description: "Partial Outage" },
        components: [
          { name: "Posts API", status: "major_outage" },
          { name: "Group", status: "operational", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["posts-api"].state, "down");
  assertEquals("group" in (report.components ?? {}), false);
});

Deno.test("health/service: a failed status fetch reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/service: declares service kind, app scope defaults, and its own network.allow", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["www.linkedin-apistatus.com"]);
});
