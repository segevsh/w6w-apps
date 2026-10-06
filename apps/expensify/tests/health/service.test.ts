import { assert, assertEquals } from "@std/assert";
import check, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The live body, trimmed — measured 2026-10-06. */
const LIVE = {
  page: { id: PAGE_ID, name: "Expensify", url: "https://status.expensify.com" },
  status: { description: "All Systems Operational", indicator: "none" },
  components: [
    { id: "a", name: "Expensify Website And Mobile App", status: "operational" },
    { id: "b", name: "Integration APIs", status: "operational" },
    { id: "c", name: "Report PDFs", status: "operational" },
    { id: "d", name: "Chase", status: "operational" },
  ],
};

const withStatuses = (s: Record<string, string>) => ({
  ...LIVE,
  components: LIVE.components.map((c) => ({ ...c, status: s[c.name] ?? c.status })),
});

Deno.test("service: unsigned app-scoped check that widens egress to the status host only", () => {
  assertEquals([check.kind, check.scope, check.credential], ["service", "app", "none"]);
  assertEquals(check.network?.allow, ["status.expensify.com"]);
  assertEquals(STATUS_URL, "https://status.expensify.com/api/v2/summary.json");
});

Deno.test("service: all operational is ok and lists every component", async () => {
  const { ctx, calls } = mockCtx([{ body: LIVE }]);
  const report = await check.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!), [
    "expensify-website-and-mobile-app",
    "integration-apis",
    "report-pdfs",
    "chase",
  ]);
});

Deno.test("service: an Integration APIs outage is down and names the component", async () => {
  const { ctx } = mockCtx([{ body: withStatuses({ "Integration APIs": "major_outage" }) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("Integration APIs (major_outage)"));
});

Deno.test("service: a bank-feed or app outage alone never moves the verdict", async () => {
  const { ctx } = mockCtx([{
    body: withStatuses({
      Chase: "major_outage",
      "Expensify Website And Mobile App": "partial_outage",
    }),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!.chase.state, "down");
});

Deno.test("service: a Report PDFs outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: withStatuses({ "Report PDFs": "major_outage" }) }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a page that is not Expensify's is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: { ...LIVE, page: { id: "other", name: "Expensify" } } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("not Expensify's"));
});

Deno.test("service: a missing component, a 5xx and bad JSON are unknown, never down", async () => {
  const noApi = mockCtx([{ body: { ...LIVE, components: [LIVE.components[0]] } }]);
  assertEquals((await check.check!({}, noApi.ctx)).state, "unknown");
  const five = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await check.check!({}, five.ctx)).state, "unknown");
  const junk = mockCtx([{ status: 200, body: "not json" }]);
  assertEquals((await check.check!({}, junk.ctx)).state, "unknown");
});

Deno.test("service: mapComponentStatus covers the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
