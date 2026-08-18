import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import quota from "../../health/quota.ts";

const conn = { display: { baseUrl: "https://sign.example.com" } };

Deno.test("instance: probes this connection's own /api/health, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "ok", checks: { database: { status: "ok" }, certificate: { status: "ok" } } },
  }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://sign.example.com/api/health");
  assertEquals(report.state, "ok");
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.credential, "context");
});

/**
 * The certificate check is the one worth surfacing: signing breaks while
 * everything else looks healthy.
 */
Deno.test("instance: a failing certificate check is down, and named", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      status: "ok",
      checks: { database: { status: "ok" }, certificate: { status: "error" } },
    },
  }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("certificate"), report.message);
  assertEquals(report.components!.certificate.state, "down");
  assertEquals(report.components!.database.state, "ok");
});

Deno.test("instance: an unreachable server is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

Deno.test("instance: a non-200 is down, and an odd shape is degraded", async () => {
  const bad = mockCtx([{ status: 502, body: "" }], conn);
  assertEquals((await instance.check!({}, bad.ctx)).state, "down");

  const odd = mockCtx([{ status: 200, body: { nope: true } }], conn);
  assertEquals((await instance.check!({}, odd.ctx)).state, "degraded");
});

Deno.test("instance: a healthy instance with no sub-checks still reports ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "ok" } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("no sub-checks"), report.message);
});

/** The headers arrive on every response, including errors. */
Deno.test("quota: reads the rate-limit headers Documenso sends", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "999",
      "x-ratelimit-reset": "1787063580",
    },
    body: { data: [] },
  }], conn);
  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://sign.example.com/api/v2/envelope?perPage=1");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "999/1000 requests");
  // Epoch SECONDS here, unlike LaunchDarkly's milliseconds.
  assertEquals(report.quota![0].resetAt, new Date(1787063580 * 1000).toISOString());
});

/** A self-hosted instance may not rate limit at all. */
Deno.test("quota: no headers is unknown, and says why", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("may not rate limit at all"), report.message);
});

Deno.test("quota: a low or spent allowance is degraded, never down", async () => {
  for (const remaining of ["0", "50"]) {
    const { ctx } = mockCtx([{
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "1000",
        "x-ratelimit-remaining": remaining,
      },
      body: { data: [] },
    }], conn);
    assertEquals((await quota.check!({}, ctx)).state, "degraded");
  }
});

/** The headers come back even on an error, so a 4xx is still readable. */
Deno.test("quota: a failure with headers is still read; one without is unknown", async () => {
  const withHeaders = mockCtx([{
    status: 400,
    headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "998" },
    body: "",
  }], conn);
  assertEquals((await quota.check!({}, withHeaders.ctx)).state, "ok");

  const without = mockCtx([{ status: 500, body: "" }], conn);
  const report = await quota.check!({}, without.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("500"), report.message);
});
