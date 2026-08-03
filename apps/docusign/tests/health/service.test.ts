import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

interface Comp {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

function summary(indicator: string, description: string, components: Comp[]) {
  return { status: { indicator, description }, components };
}

/** Docusign's real page shape, trimmed: product groups with regional children. */
const GROUPS: Comp[] = [
  { id: "g-esign", name: "eSignature", group: true },
  { id: "g-clm", name: "CLM", group: true },
];

const OPERATIONAL = summary("none", "All Systems Operational", [
  ...GROUPS,
  { id: "1", name: "NA4", status: "operational", group_id: "g-esign" },
  { id: "2", name: "EU", status: "operational", group_id: "g-esign" },
  { id: "3", name: "DEMO", status: "operational", group_id: "g-esign" },
  { id: "4", name: "NA11", status: "operational", group_id: "g-clm" },
]);

Deno.test("service: declares an unsigned, app-scoped probe with its own egress widening", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, undefined); // defaults to "app"
  assertEquals(service.credential, undefined); // defaults to "none"
  assertEquals(service.network?.allow, ["status.docusign.com"]);
  assertEquals(service.covers, ["*"]);
});

Deno.test("service: reads the Statuspage summary and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: OPERATIONAL }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.docusign.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message?.includes("All Systems Operational"), true);
});

Deno.test("service: reports only the eSignature group, namespaced per region", async () => {
  const { ctx } = mockCtx([{ body: OPERATIONAL }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "esignature/demo",
    "esignature/eu",
    "esignature/na4",
  ]);
});

Deno.test("service: a CLM outage does not mark the eSignature app down", async () => {
  const { ctx } = mockCtx([{
    body: summary("major", "Partial System Outage", [
      ...GROUPS,
      { id: "1", name: "NA4", status: "operational", group_id: "g-esign" },
      { id: "4", name: "NA11", status: "major_outage", group_id: "g-clm" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // …but the page-wide verdict is still carried, so nothing is hidden.
  assertEquals(report.message?.includes("Partial System Outage"), true);
});

Deno.test("service: an eSignature region outage is reported as down", async () => {
  const { ctx } = mockCtx([{
    body: summary("major", "Partial System Outage", [
      ...GROUPS,
      { id: "1", name: "NA4", status: "major_outage", group_id: "g-esign" },
      { id: "2", name: "EU", status: "operational", group_id: "g-esign" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["esignature/na4"].state, "down");
  assertEquals(report.components?.["esignature/eu"].state, "ok");
});

Deno.test("service: degraded performance in one region degrades, not downs", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", "Degraded Performance", [
      ...GROUPS,
      { id: "1", name: "NA4", status: "degraded_performance", group_id: "g-esign" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: falls back to the page rollup if the eSignature group disappears", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", "Degraded Performance", [
      { id: "g-clm", name: "CLM", group: true },
      { id: "4", name: "NA11", status: "operational", group_id: "g-clm" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("no eSignature component group"), true);
});

Deno.test("service: a status page that is itself broken reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("503"), true);
});

Deno.test("service: an unrecognised component status is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    body: summary("none", "All Systems Operational", [
      ...GROUPS,
      { id: "1", name: "NA4", status: "brand_new_status", group_id: "g-esign" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["esignature/na4"].state, "unknown");
  assertEquals(report.state, "unknown");
});
