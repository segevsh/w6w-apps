import { assert, assertEquals } from "@std/assert";
import quota, { CREDITS_BALANCE_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reads the free credit-balance endpoint, signed, on the app's own host", () => {
  assertEquals(CREDITS_BALANCE_URL, "https://api.wappalyzer.com/v2/credits/balance/");
  assertEquals(quota.credential, undefined); // defaults to "signed" for kind: "quota"
  // A signed check must not widen egress — that pairing is banned by the spec.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: a positive balance reports ok with the remaining count", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: 42000 } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, CREDITS_BALANCE_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "credits", remaining: 42000, unit: "credits" }]);
});

/** Exhausted credits refuse every metered call, so this is `down`, not `degraded`. */
Deno.test("quota: a zero balance reports down and names why", async () => {
  const { ctx } = mockCtx([{ body: { credits: 0 } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/out of credits/i.test(report.message ?? ""), report.message);
});

Deno.test("quota: no vendor-stated limit is reported — none exists to divide by", async () => {
  const { ctx } = mockCtx([{ body: { credits: 5 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].limit, undefined);
});

Deno.test("quota: a refused read reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: a response with no numeric credits field reports unknown", async () => {
  const { ctx } = mockCtx([{ body: { message: "wrong shape" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
