import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reports the balance as remaining credits", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 42.5 } }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 42.5, unit: "credits" }]);
  assertEquals(calls[0].url, "https://api.linkup.so/v1/credits/balance");
});

Deno.test("quota: zero credits is down", async () => {
  const r = await quota.check!({}, mockCtx([{ body: { balance: 0 } }]).ctx);
  assertEquals(r.state, "down");
});

Deno.test("quota: an error or a body without a number is unknown", async () => {
  const a = await quota.check!(
    {},
    mockCtx([{ status: 401, body: { error: { code: "UNAUTHORIZED" } } }]).ctx,
  );
  assertEquals(a.state, "unknown");
  const b = await quota.check!({}, mockCtx([{ body: { balance: "lots" } }]).ctx);
  assertEquals(b.state, "unknown");
  assertEquals(quota.severity, "informational");
});
