import { assert, assertEquals } from "@std/assert";
import check, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The live body, trimmed — measured 2026-10-06. */
const LIVE = {
  page: { id: PAGE_ID, name: "Dub", url: "https://status.dub.co/" },
  status: { description: "All Systems Operational", indicator: "none" },
  components: [
    { id: "a", name: "App", status: "operational" },
    { id: "b", name: "API", status: "operational" },
    { id: "c", name: "Link Redirects", status: "operational" },
    { id: "d", name: "Website", status: "operational" },
  ],
};

const withComponents = (statuses: Record<string, string>) => ({
  ...LIVE,
  components: LIVE.components.map((c) => ({ ...c, status: statuses[c.name] ?? c.status })),
});

Deno.test("service: unsigned app-scoped check that widens egress to the status host only", () => {
  assertEquals([check.kind, check.scope, check.credential], ["service", "app", "none"]);
  assertEquals(check.network?.allow, ["status.dub.co"]);
  assertEquals(STATUS_URL, "https://status.dub.co/api/v2/summary.json");
});

Deno.test("service: all operational is ok and lists every component", async () => {
  const { ctx, calls } = mockCtx([{ body: LIVE }]);
  const report = await check.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!), ["app", "api", "link-redirects", "website"]);
});

Deno.test("service: an API outage is down and names the component", async () => {
  const { ctx } = mockCtx([{ body: withComponents({ API: "major_outage" }) }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("API (major_outage)"));
});

Deno.test("service: the dashboard and website alone never move the verdict", async () => {
  const { ctx } = mockCtx([{
    body: withComponents({ App: "major_outage", Website: "partial_outage" }),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!.app.state, "down");
});

Deno.test("service: a link-redirects outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: withComponents({ "Link Redirects": "major_outage" }) }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a page that is not Dub's is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: { ...LIVE, page: { id: "other", name: "Dub" } } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("not Dub's"));
});

Deno.test("service: a missing API component, a 5xx and bad JSON are unknown, never down", async () => {
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
  assertEquals(mapComponentStatus("full_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
