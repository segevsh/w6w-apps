import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const open = (over: Record<string, unknown> = {}) => ({
  service_name: " Google Ads API",
  status_impact: "SERVICE_DISRUPTION",
  external_desc: "Elevated error rates on the Google Ads API.",
  ...over,
});

const closed = (over: Record<string, unknown> = {}) => ({
  service_name: " Google Ads",
  status_impact: "SERVICE_OUTAGE",
  external_desc: "Resolved incident.",
  end: "2026-07-01T00:00:00+00:00",
  ...over,
});

Deno.test("service: probes the Google Ads dashboard, not the Workspace one", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["ads.google.com"]);
  // Google Ads is not a Workspace product; that feed would never mention it.
  assert(!JSON.stringify(service.network).includes("www.google.com"));
});

Deno.test("service: the status host is not on the app's own egress allowlist", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assertEquals(pkg.w6w.network.allow, ["googleads.googleapis.com"]);
  assert(!pkg.w6w.network.allow.includes("ads.google.com"));
});

Deno.test("service: no open incident is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [closed()] }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://ads.google.com/status/publisher/incidents.json");
});

Deno.test("service: an open Google Ads API disruption is degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [open()] }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert((out.message ?? "").includes("Elevated error rates"));
  assertEquals(out.components?.["google-ads-api"].state, "degraded");
  assertEquals(out.components?.["google-ads"].state, "ok");
});

Deno.test("service: an open outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [open({ status_impact: "SERVICE_OUTAGE" })] }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: matching tolerates the feed's leading space in service_name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ ...open(), service_name: "Google Ads API" }] }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a `Multiple Products` incident is matched via affected_products", async () => {
  // The broad outages that matter most carry the literal service_name
  // "Multiple Products" and name the real ones only in affected_products[].
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Multiple Products",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Several products affected.",
      affected_products: [{ title: " AdMob" }, { title: " Google Ads" }],
    }],
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.["google-ads"].state, "down");
});

Deno.test("service: another product's outage is not this app's outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: " Google Ad Manager",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "GAM is down.",
      affected_products: [{ title: " Google Ad Manager" }],
    }],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: an informational notice is not a degradation", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [open({ status_impact: "SERVICE_INFORMATION" })],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a failing dashboard is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert((out.message ?? "").includes("503"));
});

Deno.test("service: an unexpected payload shape is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { incidents: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
