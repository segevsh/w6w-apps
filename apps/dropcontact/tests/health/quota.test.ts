import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: signed zero-cost read with a credits reading", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true, credits_left: 250 } }]);
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
  const report = await quota.check!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: [{}] });
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "credits", remaining: 250, unit: "credits" }]);
});

Deno.test("quota: zero credits and a 403 are down", async () => {
  const empty = await quota.check!({}, mockCtx([{ body: { success: true, credits_left: 0 } }]).ctx);
  assertEquals(empty.state, "down");
  const refused = await quota.check!(
    {},
    mockCtx([{ status: 403, body: { error: true, reason: "Token exceeded quota" } }]).ctx,
  );
  assertEquals(refused.state, "down");
});

Deno.test("quota: a bad token or a body without credits_left is unknown", async () => {
  assertEquals(
    (await quota.check!({}, mockCtx([{ status: 401, body: { error: true } }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await quota.check!({}, mockCtx([{ body: { success: true } }]).ctx)).state,
    "unknown",
  );
});
