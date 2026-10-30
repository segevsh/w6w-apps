import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

test("service: maps 'none' indicator with all-operational components to ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "abc", name: "Desktop Web", status: "operational" },
        { id: "def", name: "Vote Processing", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://www.redditstatus.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["Vote Processing"], { state: "ok" });
});

test("service: a major_outage component reports down without pulling the whole app down (severity: degraded)", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "critical", description: "Major outage" },
      components: [{ id: "abc", name: "Comment Processing", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["Comment Processing"], { state: "down" });
  assertEquals(service.severity, "degraded");
});

test("service: maps a degraded_performance component", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor", description: "Partial degradation" },
      components: [{ id: "abc", name: "Mobile Web", status: "degraded_performance" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

test("service: reports unknown when the status API itself errors", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: declares credential: none and app scope, so it runs unsigned once for everyone", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["www.redditstatus.com"]);
});
