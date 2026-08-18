import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const conn = { display: { instance: "commercial" } };
const component = (name: string, status: string, group = false) => ({ name, status, group });

const OPERATIONAL = {
  components: [
    component("Authentication", "operational"),
    component("Flag targeting", "operational"),
    component("Segment management", "operational"),
    component("Account management", "operational"),
    component("Audit log", "operational"),
    component("Server-side streaming API", "operational"),
    component("Polling API", "operational"),
    component("Feature management (core functionality)", "operational", true),
  ],
};

Deno.test("service: probes the status page unsigned, with the host declared", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: OPERATIONAL }], conn);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.launchdarkly.com/api/v2/components.json");
  assertEquals(service.network!.allow, ["status.launchdarkly.com"]);
});

Deno.test("service: reads the five management components", async () => {
  const { ctx } = mockCtx([{ status: 200, body: OPERATIONAL }], conn);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), [
    "account-management",
    "audit-log",
    "authentication",
    "flag-targeting",
    "segment-management",
  ]);
});

/**
 * The four components with "API" in the name are the SDK delivery network,
 * which no action here touches — watching them would report the wrong outage
 * and miss the right one.
 */
Deno.test("service: the streaming and polling APIs are NOT what this app watches", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Server-side streaming API", "major_outage"),
        component("Polling API", "major_outage"),
        component("Authentication", "operational"),
        component("Flag targeting", "operational"),
      ],
    },
  }], conn);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components!["server-side-streaming-api"], undefined);
});

Deno.test("service: an outage on flag targeting is down, and names it", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      components: [
        component("Flag targeting", "major_outage"),
        component("Authentication", "operational"),
      ],
    },
  }], conn);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("Flag targeting"), report.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { components: [component("Authentication", "degraded_performance")] },
  }], conn);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }], conn);
  assertEquals((await service.check!({}, failed.ctx)).state, "unknown");

  const renamed = mockCtx(
    [{ status: 200, body: { components: [component("Something", "x")] } }],
    conn,
  );
  const report = await service.check!({}, renamed.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer names"), report.message);
});

/** The headers are documented in prose but declared on no response. */
Deno.test("quota: reports the global pair when LaunchDarkly sends it", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-global-limit": "1000",
      "x-ratelimit-global-remaining": "900",
      "x-ratelimit-reset": "1787061262429",
    },
    body: { items: [] },
  }], conn);
  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/projects?limit=1");
  assertEquals(report.state, "ok");
  assert(report.message!.includes("900/1000"), report.message);
  const bucket = report.quota!.find((q) => q.id === "global-per-10s")!;
  // The reset is epoch MILLISECONDS, unlike most APIs.
  assertEquals(bucket.resetAt, new Date(1787061262429).toISOString());
});

Deno.test("quota: says so plainly when the headers are absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { items: [] } }], conn);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no global rate-limit headers"), report.message);
});

Deno.test("quota: the route pair is context, never the verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-route-limit": "10",
      "x-ratelimit-route-remaining": "1",
    },
    body: { items: [] },
  }], conn);
  const report = await quota.check!({}, ctx);
  // A nearly-spent route budget must not become the account's verdict.
  assertEquals(report.state, "unknown");
  assertEquals(report.quota!.find((q) => q.id === "route-per-10s")!.remaining, 1);
});

Deno.test("quota: a low or spent global allowance is degraded, never down", async () => {
  for (const remaining of ["0", "5"]) {
    const { ctx } = mockCtx([{
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-global-limit": "1000",
        "x-ratelimit-global-remaining": remaining,
      },
      body: { items: [] },
    }], conn);
    // A ten-second window recovers by itself; it is not an outage.
    assertEquals((await quota.check!({}, ctx)).state, "degraded");
  }
});

Deno.test("quota: an unusable credential is unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], conn);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
