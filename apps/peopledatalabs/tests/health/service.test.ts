import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = { id: PAGE_ID, name: "People Data Labs" };
const comps = (over: Record<string, string> = {}) => [
  { id: "g1", name: "Person Enrichment APIs", status: "operational", group: true, group_id: null },
  { id: "c1", name: "Person Enrichment API", status: over.c1 ?? "operational", group_id: "g1" },
  { id: "c2", name: "Company Enrichment API", status: over.c2 ?? "operational", group_id: "g2" },
  { id: "gs", name: "API Sandbox", status: "operational", group: true, group_id: null },
  {
    id: "s1",
    name: "Sandbox Person Search API",
    status: over.s1 ?? "operational",
    group_id: "53zq69ntwsrz",
  },
  { id: "w1", name: "Web Portal", status: over.w1 ?? "operational", group_id: "vl73z6lnzk16" },
];
const summary = (over: Record<string, string> = {}) => ({
  page,
  components: comps(over),
  incidents: [],
  status: { indicator: "none" },
});

Deno.test("service: a unsigned status-feed check on status.peopledatalabs.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.peopledatalabs.com"]);
});

Deno.test("service: all operational is ok, group rows are skipped", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), ["c1", "c2", "s1", "w1"]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/summary.json");
});

Deno.test("service: an API component outage drives the verdict", async () => {
  const r = await service.check!(
    {} as never,
    mockCtx([{ body: summary({ c1: "major_outage" }) }]).ctx,
  );
  assertEquals(r.state, "down");
  assert(r.message!.includes("Person Enrichment API (major_outage)"));
});

Deno.test("service: sandbox and dashboard trouble is shown but does not drive the verdict", async () => {
  const r = await service.check!(
    {} as never,
    mockCtx([{ body: summary({ s1: "major_outage", w1: "partial_outage" }) }]).ctx,
  );
  assertEquals(r.state, "ok");
  assertEquals(r.components!["s1"].state, "down");
  assert(r.message!.includes("Sandbox Person Search API"));
});

Deno.test("service: a foreign page, a bad body and an HTTP error are unknown, never down", async () => {
  const foreign = await service.check!(
    {} as never,
    mockCtx([{ body: { ...summary(), page: { id: "zzz" } } }]).ctx,
  );
  assertEquals(foreign.state, "unknown");
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: "<html/>" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: { page, components: [] } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
