import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const component = (name: string, status: string, group = false) => ({ name, status, group });

const OPERATIONAL = {
  components: [
    component("API", "operational"),
    component("Transactional", "operational"),
    component("Campaigns", "operational"),
    component("SMTP Relay", "operational"),
    component("Webhooks", "operational"),
    component("App", "operational"),
    component("Email Sending", "operational", true),
  ],
};

Deno.test("service: probes Loops' own status page, unsigned, host declared", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: OPERATIONAL }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.loops.so/api/v2/components.json");
  assertEquals(service.network!.allow, ["status.loops.so"]);
});

Deno.test("service: all watched components operational is ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: OPERATIONAL }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), ["api", "campaigns", "transactional"]);
});

Deno.test("service: an outage on sending is down, and names the component", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [component("Transactional", "major_outage"), component("API", "operational")],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("Transactional"), report.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [component("API", "degraded_performance")] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** The SMTP relay and webhooks are real Loops services no action here touches. */
Deno.test("service: an outage in a component this app does not use is not its outage", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("SMTP Relay", "major_outage"),
        component("Webhooks", "major_outage"),
        component("API", "operational"),
      ],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the group heading is skipped — its status is a roll-up", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [component("API", "major_outage", true), component("API", "operational")],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, failed.ctx)).state, "unknown");

  const junk = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");

  const renamed = mockCtx([{ status: 200, body: { components: [component("Something", "x")] } }]);
  const report = await service.check!({}, renamed.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer names"), report.message);
});

/** Loops models 429s but publishes no header and no usage endpoint. */
Deno.test("quota: is a declared absence, with the evidence in the reason", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.includes("2026-08-18"), reason);
  assert(reason.includes("429"), reason);
  assert(reason.includes("/v1/api-key"), reason);
});
