import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

const summary = (indicator: string, components: Array<Record<string, unknown>> = []) => ({
  page: { id: "g83kktkx21mx", name: "Constant Contact" },
  status: { indicator, description: indicator === "none" ? "All Systems Operational" : "Issues" },
  components,
});

Deno.test("service: is an unsigned, app-scoped service check", () => {
  assertEquals(check.key, "service");
  assertEquals(check.kind, "service");
  assertEquals(check.credential, undefined, "defaults to `none` for kind service");
  assertEquals(check.scope, undefined, "defaults to `app` for kind service");
});

Deno.test("service: widens egress to the status host only, and not to the API host", () => {
  assertEquals(check.network?.allow, ["status.constantcontact.com"]);
  assert(!check.network?.allow?.includes("api.cc.email"));
});

Deno.test("service: a `none` indicator reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("none") }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "status.constantcontact.com");
  assertEquals(url.pathname, "/api/v2/summary.json");
});

Deno.test("service: minor maps to degraded, major and critical to down", async () => {
  for (
    const [indicator, state] of [
      ["minor", "degraded"],
      ["major", "down"],
      ["critical", "down"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: summary(indicator) }]);
    assertEquals((await check.check!({}, ctx)).state, state, indicator);
  }
});

Deno.test("service: an unrecognised indicator reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ body: summary("weather") }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

Deno.test("service: slugs each component and maps its status", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [
      { name: "API's and Integrations", status: "operational" },
      { name: "Email Delivery", status: "major_outage" },
      { name: "Contact Management", status: "degraded_performance" },
      { name: "Landing Pages", status: "under_maintenance" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components?.["api-s-and-integrations"]?.state, "ok");
  assertEquals(report.components?.["email-delivery"]?.state, "down");
  assertEquals(report.components?.["contact-management"]?.state, "degraded");
  assertEquals(report.components?.["landing-pages"]?.state, "degraded");
});

Deno.test("service: an unknown component status reports unknown for that component", async () => {
  const { ctx } = mockCtx([{
    body: summary("none", [{ name: "Reporting", status: "vibes_based" }]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components?.["reporting"]?.state, "unknown");
});

Deno.test("service: duplicate component names fold to the WORST state, not last-wins", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [
      { name: "Email Campaigns", status: "major_outage" },
      { name: "Email Campaigns", status: "operational" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["email-campaigns"]);
  assertEquals(report.components?.["email-campaigns"]?.state, "down");
});

Deno.test("service: the worst-state fold is order-independent", async () => {
  const { ctx } = mockCtx([{
    body: summary("minor", [
      { name: "Email Campaigns", status: "operational" },
      { name: "Email Campaigns", status: "major_outage" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components?.["email-campaigns"]?.state, "down");
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([{
    body: summary("none", [
      { name: "Campaign Creation", status: "operational", group: true },
      { name: "API's and Integrations", status: "operational" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["api-s-and-integrations"]);
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("503"));
});

Deno.test("service: an unparseable body reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});
