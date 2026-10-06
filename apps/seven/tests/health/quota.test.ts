import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: signed, connection-scoped, informational, with no extra network.allow", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reports the balance as the remaining amount", async () => {
  const { ctx, calls } = mockCtx([{ body: { amount: 12.35, currency: "EUR" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/balance");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "balance", remaining: 12.35, unit: "EUR" });
});

Deno.test("quota: an empty balance is down; a refusal (bare 900) or odd body is unknown", async () => {
  const empty = await quota.check!({}, mockCtx([{ body: { amount: 0, currency: "EUR" } }]).ctx);
  assertEquals(empty.state, "down");
  assertEquals((await quota.check!({}, mockCtx([{ body: '"900"' }]).ctx)).state, "unknown");
  assertEquals(
    (await quota.check!({}, mockCtx([{ status: 500, body: "x", headers: {} }]).ctx)).state,
    "unknown",
  );
});
