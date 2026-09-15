import { assert, assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import { ACCEPT_HEADER } from "../../lib/client.ts";

Deno.test("quota: is a quota check with no `unavailable` — Recurly publishes real headers", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.unavailable, undefined);
});

Deno.test("quota: probes GET /sites?limit=1 on the connection's own host", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { object: "list", data: [] },
      headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "950" },
    },
  ]);
  await quota.check!({}, connected(ctx, { region: "eu" }));
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://v3.eu.recurly.com");
  assertEquals(url.pathname, "/sites");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["accept"], ACCEPT_HEADER);
});

Deno.test("quota: reports ok with plenty of headroom", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "900" },
    },
  ]);
  const report = await quota.check!({}, connected(ctx));
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 1000);
  assertEquals(report.quota?.[0].remaining, 900);
});

Deno.test("quota: reports degraded under 10% headroom", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: { "x-ratelimit-limit": "1000", "x-ratelimit-remaining": "50" },
    },
  ]);
  const report = await quota.check!({}, connected(ctx));
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports unknown when no rate-limit headers are present", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {}, headers: {} }]);
  const report = await quota.check!({}, connected(ctx));
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown (not down) on a rejected credential — the auth check's job", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { type: "invalid_api_key" } }]);
  const report = await quota.check!({}, connected(ctx));
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("401"));
});
