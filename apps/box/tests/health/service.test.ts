import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok with per-component detail on a clean summary", async () => {
  const summary = {
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { name: "API", status: "operational" },
      { name: "Uploads", status: "operational" },
      { name: "Storage & Content", status: "operational", group: true },
    ],
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: summary }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.box.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.components, {
    api: { state: "ok" },
    uploads: { state: "ok" },
  });
});

Deno.test("service: maps a major incident to down and surfaces the description", async () => {
  const summary = {
    status: { indicator: "major", description: "Partial API Outage" },
    components: [{ name: "API", status: "major_outage" }],
  };
  const { ctx } = mockCtx([{ status: 200, body: summary }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.message, "Partial API Outage");
  assertEquals(report.components, { api: { state: "down" } });
});

Deno.test("service: reports unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Internal Server Error", body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
