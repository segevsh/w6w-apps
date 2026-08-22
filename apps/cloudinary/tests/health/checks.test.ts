import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const page = (over: Record<string, string> = {}) => ({
  components: [
    "Admin API - US",
    "Upload API - US",
    "Media Transformation API - US",
    "Admin API - EU",
    "Upload API - EU",
    "Media Transformation API - EU",
    "Console",
    "Media Delivery",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

const us = { display: { cloudName: "acme", region: "us" } };
const eu = { display: { cloudName: "acme", region: "eu" } };

Deno.test("service: watches only this connection's datacenter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }], us);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!).sort(), [
    "admin-api",
    "media-transformation-api",
    "upload-api",
  ]);
  assertEquals(new URL(calls[0].url).host, "status.cloudinary.com");
});

/** An outage in another region is not this connection's problem. */
Deno.test("service: an EU outage does not touch a US connection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Admin API - EU": "major_outage" }) }], us);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the same outage IS this connection's problem in the EU", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Admin API - EU": "major_outage" }) }], eu);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("Admin API - EU"), out.message);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], us);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: renamed components report unknown rather than a false green", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Something" }] } }], us);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** It reads the connection's region and never sees a credential. */
Deno.test("service: is connection-scoped and unsigned", () => {
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "context");
  assertEquals(service.network!.allow, ["status.cloudinary.com"]);
});

Deno.test("quota: reports the hourly requests and the plan credits separately", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { plan: "Free", credits: { usage: 5, limit: 25 } },
    headers: {
      "content-type": "application/json",
      "x-featureratelimit-limit": "500",
      "x-featureratelimit-remaining": "480",
      "x-featureratelimit-reset": "Tue, 18 Aug 2026 17:00:00 GMT",
    },
  }], { display: { cloudName: "acme", region: "us" } });

  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota!.map((q) => q.id), ["api-requests", "credits"]);
  assertEquals(out.quota![0].remaining, 480);
  assertEquals(out.quota![1].remaining, 20);
  assertEquals(out.quota![0].resetAt, "2026-08-18T17:00:00.000Z");
});

Deno.test("quota: a nearly-empty hourly allowance is degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-featureratelimit-limit": "500",
      "x-featureratelimit-remaining": "10",
    },
  }], { display: { cloudName: "acme", region: "us" } });
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

/** Running out of credits changes the bill; being throttled stops the job. */
Deno.test("quota: nearly-spent credits are degraded even with requests to spare", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { credits: { usage: 24.5, limit: 25 } },
    headers: {
      "content-type": "application/json",
      "x-featureratelimit-limit": "500",
      "x-featureratelimit-remaining": "499",
    },
  }], { display: { cloudName: "acme", region: "us" } });
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: neither headers nor a usable body is unknown, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { plan: "Free" } }], {
    display: { cloudName: "acme", region: "us" },
  });
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: headroom is informational", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
