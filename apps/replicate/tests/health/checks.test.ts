import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const component = (name: string, status: string, group = false) => ({ name, status, group });

Deno.test("service: probes Replicate's own status page, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { components: [component("API", "operational")] },
  }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.replicate.com/api/v2/components.json");
  assertEquals(service.network!.allow, ["status.replicate.com"]);
});

Deno.test("service: reads the API and prediction components", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("API", "operational"),
        component("Predictions", "operational"),
        component("Website", "major_outage"),
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  // The website is not something any action calls.
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), ["api", "predictions"]);
});

Deno.test("service: an API outage is down and names the component", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [component("API", "major_outage")] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("API"), report.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [component("Prediction API", "degraded_performance")] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: group rows are skipped — their status is a roll-up", async () => {
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

  const renamed = mockCtx([{ status: 200, body: { components: [component("Website", "ok")] } }]);
  const report = await service.check!({}, renamed.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no API or prediction components"), report.message);
});

/** Replicate bills compute, so there is no request allowance to report. */
Deno.test("quota: is a declared absence explaining the billing model", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.includes("compute time"), reason);
  assert(reason.includes("2026-08-18"), reason);
  assert(reason.includes("predict_time"), reason);
});
