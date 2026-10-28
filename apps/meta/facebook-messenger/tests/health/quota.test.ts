import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const input = { credential: undefined } as never;
const usage = (u: unknown) => ({
  "content-type": "application/json",
  "x-app-usage": JSON.stringify(u),
});

Deno.test("health/quota: informational quota check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("health/quota: reports remaining percent per meter", async () => {
  const { ctx } = mockCtx([{
    body: { id: "1" },
    headers: usage({ call_count: 40, total_time: 10 }),
  }]);
  const r = await quota.check!(input, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.find((q) => q.id === "call_count")?.remaining, 60);
});

Deno.test("health/quota: 95% is degraded, 100% is down", async () => {
  const a = mockCtx([{ body: {}, headers: usage({ call_count: 95 }) }]);
  assertEquals((await quota.check!(input, a.ctx)).state, "degraded");
  const b = mockCtx([{ body: {}, headers: usage({ call_count: 100 }) }]);
  assertEquals((await quota.check!(input, b.ctx)).state, "down");
});

Deno.test("health/quota: missing header, bad JSON, non-2xx are unknown", async () => {
  assertEquals((await quota.check!(input, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals(
    (await quota.check!(input, mockCtx([{ body: {}, headers: { "x-app-usage": "{" } }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!(input, mockCtx([{ status: 500, body: {} }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!(input, mockCtx([{ body: {}, headers: usage({}) }]).ctx)).state,
    "unknown",
  );
});
