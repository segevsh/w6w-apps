import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

const summary = (indicator: string, components: Array<Record<string, unknown>> = []) => ({
  page: { name: "MailerLite" },
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
  assertEquals(check.network?.allow, ["status.mailerlite.com"]);
  assert(!check.network?.allow?.includes("connect.mailerlite.com"));
});

Deno.test("service: an `none` indicator reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("none") }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/summary.json");
});

Deno.test("service: minor maps to degraded, major and critical to down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], [
      "critical",
      "down",
    ]] as const
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
      { name: "MailerLite API & integrations", status: "operational" },
      { name: "MailerLite Classic API & integrations", status: "major_outage" },
      { name: "MailerLite Automations", status: "degraded_performance" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components?.["mailerlite-api-integrations"]?.state, "ok");
  assertEquals(report.components?.["mailerlite-classic-api-integrations"]?.state, "down");
  assertEquals(report.components?.["mailerlite-automations"]?.state, "degraded");
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([{
    body: summary("none", [
      { name: "Platform", status: "operational", group: true },
      { name: "MailerLite API & integrations", status: "operational" },
    ]),
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["mailerlite-api-integrations"]);
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
