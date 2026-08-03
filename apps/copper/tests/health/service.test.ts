import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (
  indicator: string,
  components: Array<{ name: string; status: string; group?: boolean }> = [],
) => ({
  page: { id: "htdm1sj52pny", name: "Copper" },
  status: { indicator, description: `desc:${indicator}` },
  components,
});

Deno.test("service: declares an app-scoped, unsigned check that widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.copper.com"]);
  // Unsigned is what makes widening egress safe: a status host must never see
  // Copper's three credential headers.
  assert(service.credential === undefined || service.credential === "none");
  // The API host is deliberately NOT restated here.
  assert(!service.network!.allow!.includes("api.copper.com"));
});

Deno.test("service: probes summary.json on status.copper.com, not the copper.statuspage.io decoy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary("none") }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.copper.com/api/v2/summary.json");
  assert(!calls[0].url.includes("statuspage.io"));
});

Deno.test("service: maps every Statuspage rollup indicator", async () => {
  const cases: Array<[string, string]> = [
    ["none", "ok"],
    ["minor", "degraded"],
    ["major", "down"],
    ["critical", "down"],
  ];
  for (const [indicator, expected] of cases) {
    const { ctx } = mockCtx([{ status: 200, body: summary(indicator) }]);
    const out = await service.check!({}, ctx);
    assertEquals(out.state, expected, indicator);
    assertEquals(out.message, `desc:${indicator}`);
  }
});

Deno.test("service: an unrecognised indicator is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("brand-new-word") }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: reports per-component state, slugged, skipping group headers", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary("minor", [
      { name: "Developer API", status: "operational" },
      { name: "Rest API & Web Application", status: "degraded_performance" },
      { name: "Google Sync", status: "major_outage" },
      { name: "Reporting", status: "under_maintenance" },
      { name: "Everything", status: "operational", group: true },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.components, {
    "developer-api": { state: "ok" },
    "rest-api-web-application": { state: "degraded" },
    "google-sync": { state: "down" },
    "reporting": { state: "degraded" },
  });
  // Group headers restate their children and would double-count.
  assert(!("everything" in (out.components ?? {})));
});

Deno.test("service: an unknown component status is unknown, not silently ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary("none", [{ name: "Forms Builder", status: "something_new" }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.components, { "forms-builder": { state: "unknown" } });
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  // A status page that itself breaks says nothing about Copper; calling that an
  // outage would be a lie.
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"));
});

Deno.test("service: an unparseable body reports unknown rather than throwing", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "<html>not json</html>", headers: { "content-type": "text/html" } },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
