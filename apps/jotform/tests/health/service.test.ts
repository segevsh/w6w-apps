import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.jotform.com"]);
  // `credential` defaults to "none" for kind "service" — never declared signed.
  assertEquals(service.credential, undefined);
});

Deno.test("service: maps the Statuspage indicator and per-component status", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "minor", description: "Partial Outage" },
        components: [
          { name: "Forms", status: "operational", group: false },
          { name: "Submission Service", status: "degraded_performance", group: false },
          { name: "Region Group", status: "degraded_performance", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.jotform.com/api/v2/summary.json");
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Partial Outage");
  assertEquals(report.components?.forms.state, "ok");
  assertEquals(report.components?.["submission-service"].state, "degraded");
  // Group headers are skipped — only leaf components are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: an all-clear page reports ok", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [{ name: "API", status: "operational" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "ok");
});

Deno.test("service: major outage maps to down", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: { indicator: "major" }, components: [] } },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised indicator reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: { indicator: "wat" } } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
