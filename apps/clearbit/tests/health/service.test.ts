import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps a clean Statuspage summary to ok with no components down", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "API", status: "operational", group: false },
        { name: "Group", status: "operational", group: true },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.clearbit.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components?.["api"].state, "ok");
  assertEquals(result.components?.["group"], undefined);
});

Deno.test("service: maps a major incident to down", async () => {
  const { ctx } = mockCtx([{
    body: { status: { indicator: "major" }, components: [{ name: "API", status: "major_outage" }] },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(result.components?.["api"].state, "down");
});

Deno.test("service: a failed status-page fetch reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: declares app scope, no credential, degraded severity default", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.clearbit.com"]);
});
