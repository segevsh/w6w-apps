import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: is a service check, unsigned, scoped to the whole app", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.recurly.com"]);
});

Deno.test("service: maps the Statuspage 'none' indicator to ok", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { status: { indicator: "none", description: "All Systems Operational" } },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://status.recurly.com/api/v2/summary.json");
});

Deno.test("service: maps minor/major/critical indicators", async () => {
  for (
    const [indicator, expected] of [["minor", "degraded"], ["major", "down"], [
      "critical",
      "down",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ status: 200, body: { status: { indicator } } }]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, indicator);
  }
});

Deno.test("service: reports unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown for an unrecognised indicator rather than guessing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: { indicator: "something-new" } } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: omits `components` entirely when Recurly reports none (its live shape today)", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: { indicator: "none" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components, undefined);
});

Deno.test("service: maps per-component states when Recurly ever reports them", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "minor" },
        components: [
          { name: "API", status: "degraded_performance" },
          { name: "Grouping", status: "major_outage", group: true },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["api"]?.state, "degraded");
  // Group headers restate their children's worst state — skipped.
  assertEquals(report.components?.["grouping"], undefined);
});
