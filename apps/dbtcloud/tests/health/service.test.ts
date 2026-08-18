import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (indicator: string, extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    page: { name: "dbt Cloud" },
    status: { indicator, description: `${indicator} description` },
    components: [],
    ...extra,
  },
});

/**
 * Measured 2026-08-18: dbt's Statuspage publishes `components: []`, so the
 * per-component reading every other Statuspage app does would find nothing.
 * The overall indicator is the whole of what the vendor says.
 */
Deno.test("service: reads the overall indicator, since components are empty", async () => {
  const { ctx, calls } = mockCtx([summary("none")]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.getdbt.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, undefined);
});

Deno.test("service: minor is degraded, major and critical are down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([summary(indicator)]);
    assertEquals((await service.check!({}, ctx)).state, state, indicator);
  }
});

/** Reported if dbt ever fills them in, rather than silently dropped. */
Deno.test("service: components are reported when the page has any", async () => {
  const { ctx } = mockCtx([summary("none", {
    components: [
      { name: "Job Scheduler", status: "operational" },
      { name: "Everything", status: "operational", group: true },
    ],
  })]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components!), ["job-scheduler"]);
});

Deno.test("service: an open incident is named when there is no description", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "minor" },
      incidents: [{ name: "Elevated scheduler latency", status: "investigating" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assert(result.message!.includes("Elevated scheduler latency"), result.message);
});

/** A status page that itself fails tells us nothing about dbt. */
Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { page: {} } }]);
  assertEquals((await service.check!({}, shapeless.ctx)).state, "unknown");
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.getdbt.com"]);
});
