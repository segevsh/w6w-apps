import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const page = (over: Record<string, string> = {}) => ({
  components: [
    "API",
    "Status Pages",
    "Email Notifications",
    "Something Unrelated",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

/** Atlassian's own status page is, of course, a Statuspage. */
Deno.test("service: reads Atlassian's meta status page", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).host, "metastatuspage.com");
});

Deno.test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ API: "major_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: unrelated components are ignored", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Something Unrelated": "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["something-unrelated"], undefined);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: renamed components report unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Nothing" }] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Probing would spend the very budget it measures, at one per second. */
Deno.test("quota: is a declared absence naming the one-per-second limit", () => {
  assert(quota.unavailable, "quota should be declared unavailable");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(/one request per second/.test(reason), reason);
  assert(/420/.test(reason), reason);
  assert(/x-ratelimit/i.test(reason), reason);
});
