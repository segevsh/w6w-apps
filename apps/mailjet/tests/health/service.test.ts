import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (indicator: string, components: unknown[] = []) => ({
  body: {
    page: { id: "wkf4h18hjr2r", name: "Mailjet" },
    status: { indicator, description: `${indicator} description` },
    components,
  },
});

Deno.test("service: declared as an unsigned, app-scoped vendor check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  // No credential posture declared => `none`, so it reports before anyone connects.
  assertEquals(service.credential, undefined);
});

Deno.test("service: widens egress for the status host only", () => {
  assertEquals(service.network?.allow, ["status.mailjet.com"]);
});

Deno.test("service: probes summary.json for the per-component breakdown", async () => {
  const { ctx, calls } = mockCtx([summary("none")]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.mailjet.com/api/v2/summary.json");
});

Deno.test("service: sends no Authorization to a third-party status host", async () => {
  const { ctx, calls } = mockCtx([summary("none")]);
  await service.check!({}, ctx);
  assert(!("authorization" in calls[0].headers), "status probe must stay unsigned");
});

Deno.test("service: maps the four Statuspage indicators", async () => {
  for (
    const [indicator, expected] of Object.entries({
      none: "ok",
      minor: "degraded",
      major: "down",
      critical: "down",
    })
  ) {
    const { ctx } = mockCtx([summary(indicator)]);
    const report = await service.check!({}, ctx);
    assertEquals(report.state, expected, `indicator ${indicator}`);
  }
});

Deno.test("service: an unrecognised indicator is unknown, not ok", async () => {
  const { ctx } = mockCtx([summary("something-new")]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: reports each component under a slugged id", async () => {
  const { ctx } = mockCtx([summary("minor", [
    { name: "Mailjet App", status: "operational" },
    { name: "Send API", status: "degraded_performance" },
    { name: "SMTP Relay", status: "major_outage" },
  ])]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components, {
    "mailjet-app": { state: "ok" },
    "send-api": { state: "degraded" },
    "smtp-relay": { state: "down" },
  });
});

Deno.test("service: skips group headers, which only restate their children", async () => {
  const { ctx } = mockCtx([summary("none", [
    { name: "APIs", status: "operational", group: true },
    { name: "Send API", status: "operational" },
  ])]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["send-api"]);
});

Deno.test("service: a failing status page is unknown, never down", async () => {
  // A status page that itself 500s tells us nothing about Mailjet; calling that
  // an outage would be a lie.
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("503"), report.message);
});

Deno.test("service: a 200 with unparseable JSON degrades to unknown rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>oh no</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
