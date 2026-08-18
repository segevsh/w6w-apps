import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiVersion from "../../health/api-version.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { DEFAULT_VERSION } from "../../lib/client.ts";

Deno.test("service: declares the status host on its own allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.snyk.io"]);
});

Deno.test("service: reports the rollup with per-region components", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "SNYK-US-01", status: "operational" },
        { name: "SNYK-EU-01", status: "degraded_performance" },
        { name: "Regions", status: "operational", group: true },
      ],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.snyk.io/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, {
    "snyk-us-01": { state: "ok" },
    "snyk-eu-01": { state: "degraded" },
  });
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

/**
 * The version check is the app-specific one: a pinned date going stale is a
 * scheduled outage that is otherwise invisible until calls fail.
 */
Deno.test("api-version: is a signed, connection-scoped dependency check", () => {
  assertEquals(apiVersion.kind, "dependency");
  assertEquals(apiVersion.scope, "connection");
  // A signed check must not widen the allowlist.
  assertEquals(apiVersion.network, undefined);
});

Deno.test("api-version: a current version is ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/vnd.api+json",
      "snyk-version-requested": DEFAULT_VERSION,
      "snyk-version-served": DEFAULT_VERSION,
      "snyk-version-lifecycle-stage": "ga",
    },
  }], { display: {} });
  const result = await apiVersion.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(new URL(calls[0].url).searchParams.get("version"), DEFAULT_VERSION);
  assertEquals(result.state, "ok");
  assert(result.message.includes(DEFAULT_VERSION), result.message);
});

Deno.test("api-version: a served-different-from-requested version degrades", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/vnd.api+json",
      "snyk-version-served": "2025-09-17",
      "snyk-version-lifecycle-stage": "ga",
    },
  }], { display: { apiVersion: "2020-01-01" } });
  const result = await apiVersion.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "degraded");
  assert(result.message.includes("served 2025-09-17"), result.message);
  assert(result.message.includes("2020-01-01"), result.message);
});

Deno.test("api-version: a deprecation or sunset is surfaced with its date", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/vnd.api+json",
      "snyk-version-served": DEFAULT_VERSION,
      "snyk-version-lifecycle-stage": "deprecated",
      "sunset": "2027-01-01",
    },
  }], { display: {} });
  const result = await apiVersion.check!({} as never, ctx) as { state: string; message: string };
  // A deadline, not an outage.
  assertEquals(result.state, "degraded");
  assert(result.message.includes("deprecated"), result.message);
  assert(result.message.includes("2027-01-01"), result.message);
});

Deno.test("api-version: no version headers, or a failed probe, is unknown", async () => {
  const bare = mockCtx([{ status: 200, body: {} }], { display: {} });
  const a = await apiVersion.check!({} as never, bare.ctx) as { state: string; message: string };
  assertEquals(a.state, "unknown");
  assert(a.message.includes("snyk-version-"), a.message);

  const failed = mockCtx([{ status: 401, body: "" }], { display: {} });
  const b = await apiVersion.check!({} as never, failed.ctx) as { state: string; message: string };
  assertEquals(b.state, "unknown");
  assert(b.message.includes("401"), b.message);
});

Deno.test("quota: is a declared absence — retry-after is backoff, not headroom", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("retry-after"));
  assertEquals(quota.severity, "informational");
});
