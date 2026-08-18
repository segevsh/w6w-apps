import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import environment from "../../health/environment.ts";
import quota from "../../health/quota.ts";

const display = { environment: "production" };

Deno.test("environment: reports the environment and the organization count", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: [{ id: "org_1" }, { id: "org_2" }] } }],
    { display },
  );
  const result = await environment.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.workos.com/organizations?limit=100");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("production"), result.message);
  assert(result.message!.includes("2 organizations"), result.message);
});

Deno.test("environment: a full page is reported as 100+, not as exactly 100", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { data: Array.from({ length: 100 }, (_, i) => ({ i })) } }],
    { display },
  );
  assert((await environment.check!({}, ctx)).message!.includes("100+"));
});

/**
 * The failure this check exists for: a staging key doing production work, which
 * succeeds at every call and reads the wrong world.
 */
Deno.test("environment: an empty environment is degraded, with the reason named", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  const result = await environment.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/staging key/.test(result.message!), result.message);
});

/** The derived auth check owns credential failures; reporting twice helps nobody. */
Deno.test("environment: a 401 is unknown rather than down", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }], { display });
  assertEquals((await environment.check!({}, ctx)).state, "unknown");
});

Deno.test("environment: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], { display });
  assertEquals((await environment.check!({}, ctx)).state, "down");
});

Deno.test("environment: an unlabelled connection still reports, as unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [{ id: "org_1" }] } }]);
  assert((await environment.check!({}, ctx)).message!.includes("unknown"));
});

/**
 * WorkOS sends no `x-ratelimit-*` header at all, so a poll would spend a
 * request per interval to say nothing until the moment it said `down`.
 */
Deno.test("quota: is a declared absence with the measurement written down", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  assert(/x-ratelimit/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  assert(/2026-08-18/.test(quota.unavailable!.reason), quota.unavailable!.reason);
  // An informational check never worsens a roll-up verdict.
  assertEquals(quota.severity, "informational");
});
