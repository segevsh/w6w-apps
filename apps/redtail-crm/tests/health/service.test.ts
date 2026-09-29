import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { name: "Redtail Technology" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "c1", name: "Redtail API (REST)", status: "operational" },
      { id: "c2", name: "Redtail CRM", status: "operational" },
      { id: "c3", name: "Redtail Imaging", status: "operational" },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, unsigned, app-scoped", () => {
  assertEquals(service.network?.allow, ["status.redtailtechnology.com"]);
  // `credential` is left unset — the spec defaults an unset value to "none" for this kind.
  assertEquals(service.credential, undefined);
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.redtailtechnology.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
});

Deno.test("service: reads the 'Redtail API (REST)' component by name, not a sibling", async () => {
  const body = summary();
  (body.components[0] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.api?.state, "down");
});

Deno.test("service: a sibling component outage (Redtail CRM) does not affect the verdict", async () => {
  const body = summary();
  (body.components[1] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: falls back to the page-level indicator when the component is missing", async () => {
  const body = summary({ components: [] });
  body.status = { indicator: "major", description: "Partial Outage" };
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
