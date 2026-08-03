import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const SUMMARY_URL = "https://status.chargebee.com/api/v2/summary.json";

const summary = (indicator: string, components: unknown[] = []) => ({
  page: { id: "7h56br5y94wh", name: "Chargebee" },
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Issues" },
  components,
});

Deno.test("service: is an app-scoped, unsigned service check", () => {
  assertEquals(service.kind, "service");
  // `scope` and `credential` default to `app` / `none` for this kind.
  assert(service.scope === undefined || service.scope === "app");
  assert(service.credential === undefined || service.credential === "none");
});

Deno.test("service: widens egress to the status host only, and only for itself", () => {
  // A signed request must never reach a third-party status host, which is what
  // binds this widening to the unsigned posture asserted above.
  assertEquals(service.network?.allow, ["status.chargebee.com"]);
});

Deno.test("service: probes summary.json, which carries the components as well as the rollup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary("none") }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, SUMMARY_URL);
  assertEquals(calls[0].method, "GET");
  // Unsigned: nothing credential-shaped may go to a status host.
  assertEquals(calls[0].headers["authorization"], undefined);
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
    assertEquals((await service.check!({}, ctx)).state, expected, indicator);
  }
});

Deno.test("service: an unrecognised indicator is `unknown`, not silently ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("brand_new_value") }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: reports per-component state, slugged, skipping group headers", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary("minor", [
      { name: "Billing", status: "operational", group: true },
      { name: "API", status: "degraded_performance" },
      { name: "Hosted Pages", status: "operational" },
      { name: "Webhooks", status: "major_outage" },
      { name: "Portal", status: "under_maintenance" },
      { name: "Odd", status: "who_knows" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components, {
    api: { state: "degraded" },
    "hosted-pages": { state: "ok" },
    webhooks: { state: "down" },
    portal: { state: "degraded" },
    odd: { state: "unknown" },
  });
  // The group header contributed nothing — it only restates its children.
  assertEquals(Object.keys(report.components ?? {}).includes("billing"), false);
});

Deno.test("service: passes Chargebee's own description through as the message", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("none") }]);
  assertEquals((await service.check!({}, ctx)).message, "All Systems Operational");
});

Deno.test("service: a broken status page is `unknown`, never `down`", async () => {
  // A status page that itself fails tells us nothing about the vendor, and
  // reporting that as an outage would be a lie.
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("503"));
});

Deno.test("service: a non-JSON 200 degrades to `unknown` rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>parked domain</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
