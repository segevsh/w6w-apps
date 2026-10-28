import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import organization from "../../health/organization.ts";
import quota from "../../health/quota.ts";

const display = { organization: "contoso" };
const projects = (list: unknown[]) => ({ status: 200, body: { count: list.length, value: list } });

Deno.test("organization: reports how many projects the token can see", async () => {
  const { ctx, calls } = mockCtx([projects([{ id: "p1" }, { id: "p2" }])], { display });
  const result = await organization.check!({}, ctx);
  assert(calls[0].url.startsWith("https://dev.azure.com/contoso/_apis/projects"), calls[0].url);
  assertEquals(calls[0].redirect, "manual");
  assertEquals(result.state, "ok");
  assert(/2 projects visible/.test(result.message!), result.message);
});

/** Authenticated and blind is a scope, not an empty account. */
Deno.test("organization: seeing no projects is degraded, with the scope named", async () => {
  const { ctx } = mockCtx([projects([])], { display });
  const result = await organization.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Project and Team \(read\) scope/.test(result.message!), result.message);
});

/** The 302 nobody expects. */
Deno.test("organization: a redirect is named as an expired token", async () => {
  const { ctx } = mockCtx([{ status: 302, body: "" }], { display });
  const result = await organization.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/sign-in page/.test(result.message!), result.message);
});

Deno.test("organization: a 404 means the organization does not answer", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], { display });
  const result = await organization.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/no organization named "contoso"/.test(result.message!), result.message);
});

Deno.test("organization: a 401 is unknown, since the derived check owns it", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }], { display });
  assertEquals((await organization.check!({}, ctx)).state, "unknown");
});

Deno.test("organization: a connection with no organization says so rather than guessing", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await organization.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * Azure DevOps meters throughput units, and sends the headers only as the limit
 * is approached — so silence means healthy and a poll would report unknown on
 * every healthy run.
 */
Deno.test("quota: is a declared absence explaining the throughput-unit model", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/THROUGHPUT UNITS/.test(reason), reason);
  assert(/five-minute sliding window/.test(reason), reason);
  assert(/silence means healthy/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
