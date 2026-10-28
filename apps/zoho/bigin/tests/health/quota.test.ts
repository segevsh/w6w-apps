import { assertEquals } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: informational, connection-scoped and signed (the kind's defaults)", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, undefined);
  assertEquals(quota.credential, undefined);
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes the cheapest authenticated call, on the connection's region", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { users: [] } }], "https://www.zohoapis.in");
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://www.zohoapis.in/bigin/v2/users?type=CurrentUser");
});

Deno.test("quota: a missing header is ok, not unknown — Zoho reports only above 50% usage", async () => {
  const { ctx } = mockBiginCtx([{ body: { users: [] } }]);
  const result = await quota.check!({}, ctx) as { state: string; message?: string };
  assertEquals(result.state, "ok");
  assertEquals(result.message?.includes("50%"), true);
});

Deno.test("quota: reports the remaining credits when Zoho sends the header", async () => {
  const { ctx } = mockBiginCtx([
    { headers: { "x-api-credits-remaining": "4321" }, body: { users: [] } },
  ]);
  const result = await quota.check!({}, ctx) as {
    state: string;
    quota?: Array<{ id?: string; remaining?: number; unit?: string }>;
  };
  assertEquals(result.state, "ok");
  assertEquals(result.quota, [{ id: "daily-credits", remaining: 4321, unit: "credits" }]);
});

Deno.test("quota: low headroom degrades, exhausted headroom is down", async () => {
  const low = mockBiginCtx([{ headers: { "x-api-credits-remaining": "500" }, body: {} }]);
  assertEquals(((await quota.check!({}, low.ctx)) as { state: string }).state, "degraded");
  const gone = mockBiginCtx([{ headers: { "x-api-credits-remaining": "0" }, body: {} }]);
  assertEquals(((await quota.check!({}, gone.ctx)) as { state: string }).state, "down");
});

Deno.test("quota: an unparseable header is unknown, never a made-up number", async () => {
  const { ctx } = mockBiginCtx([
    { headers: { "x-api-credits-remaining": "lots" }, body: {} },
  ]);
  assertEquals(((await quota.check!({}, ctx)) as { state: string }).state, "unknown");
});

Deno.test("quota: a failing probe is unknown, not a fabricated state", async () => {
  const { ctx } = mockBiginCtx([{ status: 401, body: { code: "INVALID_TOKEN" } }]);
  const result = await quota.check!({}, ctx) as { state: string; message?: string };
  assertEquals(result.state, "unknown");
  assertEquals(result.message?.includes("401"), true);
});
