import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import { API_HOSTS } from "../../lib/client.ts";

/** A `/user/usage` envelope: `api` calls used today, `limit-left` remaining. */
const usage = (api: string | undefined, limitLeft: number | undefined) =>
  envelope({ submissions: "478", ...(api === undefined ? {} : { api }) }, {
    ...(limitLeft === undefined ? {} : { "limit-left": limitLeft }),
  });

Deno.test("quota: is informational and declares no extra egress (it is signed)", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes /user/usage and derives the limit from used + remaining", async () => {
  const { ctx, calls } = mockCtx([{ body: usage("14", 4986) }]);
  const report = await quota.check!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.host, API_HOSTS.us);
  assertEquals(url.pathname, "/user/usage");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "daily",
    limit: 5000,
    remaining: 4986,
    unit: "requests",
  }]);
});

Deno.test("quota: probes the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: usage("1", 999) }], {
    display: { apiHost: API_HOSTS.eu },
  });
  await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).host, API_HOSTS.eu);
});

Deno.test("quota: reports remaining without a limit when `api` is absent", async () => {
  const { ctx } = mockCtx([{ body: usage(undefined, 900) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, undefined);
  assertEquals(report.quota?.[0].remaining, 900);
});

Deno.test("quota: under 10% headroom degrades", async () => {
  const { ctx } = mockCtx([{ body: usage("950", 50) }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: a spent daily allowance reports down", async () => {
  const { ctx } = mockCtx([{ body: usage("1000", 0) }]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: a response without limit-left reports unknown", async () => {
  const { ctx } = mockCtx([{ body: usage("14", undefined) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "response carried no `limit-left` field");
});

Deno.test("quota: a failing probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
