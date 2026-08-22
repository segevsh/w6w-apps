import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import permissions from "../../health/permissions.ts";
import quota from "../../health/quota.ts";

const keyInfo = (scopes: string[], title = "Automation Bot") => ({
  status: 200,
  body: { success: true, results: { title, scopes } },
});

Deno.test("permissions: reports how many scopes and how many allow writing", async () => {
  const { ctx, calls } = mockCtx([keyInfo(["candidates:read", "candidates:write", "jobs:read"])]);
  const result = await permissions.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/apiKey.info");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.state, "ok");
  assert(/3 scopes/.test(result.message!), result.message);
  assert(/1 allow writing/.test(result.message!), result.message);
});

/**
 * The failure this check exists for: a read-only key authenticates flawlessly
 * and is refused by every write.
 */
Deno.test("permissions: a read-only key is flagged in the message", async () => {
  const { ctx } = mockCtx([keyInfo(["candidates:read", "jobs:read"])]);
  const result = await permissions.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/all read-only/.test(result.message!), result.message);
});

Deno.test("permissions: a key with no scopes at all is down", async () => {
  const { ctx } = mockCtx([keyInfo([])]);
  const result = await permissions.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/every action will be refused/.test(result.message!), result.message);
});

/** A narrow key without `apiKeysRead` is working as intended, not broken. */
Deno.test("permissions: a 403 is unknown with the reason, not down", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  const result = await permissions.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/apiKeysRead/.test(result.message!), result.message);
});

/** The derived auth check owns credential failures. */
Deno.test("permissions: a 401 is unknown rather than down", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  assertEquals((await permissions.check!({}, ctx)).state, "unknown");
});

Deno.test("permissions: a success:false refusal is unknown too", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, errorInfo: { code: "x" } } }]);
  assertEquals((await permissions.check!({}, ctx)).state, "unknown");
});

Deno.test("permissions: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await permissions.check!({}, ctx)).state, "down");
});

/**
 * Ashby documents a limit for the report endpoints only, and this app
 * implements neither.
 */
Deno.test("quota: is a declared absence naming what Ashby does publish", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/15 requests per minute/.test(reason), reason);
  assert(/report\.generate/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
