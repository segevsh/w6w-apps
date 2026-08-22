import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import tenant from "../../health/tenant.ts";
import quota from "../../health/quota.ts";

const display = { region: "commercial" };
const frameworks = (data: unknown[]) => ({
  status: 200,
  body: { results: { data, pageInfo: { hasNextPage: false } } },
});

Deno.test("tenant: probes frameworks and names one back", async () => {
  const { ctx, calls } = mockCtx([frameworks([{ name: "ISO 27001" }])], { display });
  const result = await tenant.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.vanta.com/v1/frameworks?pageSize=1");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("ISO 27001"), result.message);
});

Deno.test("tenant: a gov connection probes the gov host", async () => {
  const { ctx, calls } = mockCtx([frameworks([])], { display: { region: "gov" } });
  await tenant.check!({}, ctx);
  assert(calls[0].url.startsWith("https://api.vanta-gov.com/"), calls[0].url);
});

/**
 * A 401 here usually means another process minted a token for the same
 * application — not that the secret is wrong — so it is degraded with that
 * explanation rather than left to the derived credential check.
 */
Deno.test("tenant: a 401 is degraded and points at the one-token rule", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], { display });
  const result = await tenant.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/same Vanta application/.test(result.message!), result.message);
  assert(/before rotating the secret/.test(result.message!), result.message);
});

Deno.test("tenant: a 403 is a scope problem, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }], { display });
  const result = await tenant.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/scope/.test(result.message!), result.message);
});

/** Being crowded out of a 50-per-minute budget is not the tenant being down. */
Deno.test("tenant: a 429 is degraded, and says why it happens", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], { display });
  const result = await tenant.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/50 requests a minute/.test(result.message!), result.message);
});

Deno.test("tenant: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], { display });
  assertEquals((await tenant.check!({}, ctx)).state, "down");
});

/** The whole API allows 50 requests a minute, so this must not be chatty. */
Deno.test("tenant: runs no more than four times an hour", () => {
  assertEquals(tenant.minIntervalSeconds, 900);
});

/**
 * Vanta publishes both limits and no way to observe either.
 */
Deno.test("quota: is a declared absence carrying both documented limits", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/50 requests per minute/.test(reason), reason);
  assert(/5 per minute on\s+`\/oauth\/token`/.test(reason), reason);
  assert(/one-active-token/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
