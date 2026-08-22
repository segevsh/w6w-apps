import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const components = (over: Record<string, string> = {}) => ({
  components: [
    "App",
    "Real time events",
    "API and integrations",
    "Rules and Workflows",
    "SMTP (non-Gmail / O365)",
    "Gmail",
    "O365",
    "Facebook",
    "Twitter",
    "Twilio",
    "Other channels",
    "Front chat",
    "Analytics",
    "Knowledge Base",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

Deno.test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: components() }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).host, "www.frontstatus.com");
});

/** A dead API is a real outage — nothing this app does works. */
Deno.test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: components({ "API and integrations": "major_outage" }),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("API and integrations"), out.message);
});

/**
 * A dead channel is not. Reads, comments and tagging all still work — only
 * sending on that channel does not.
 */
Deno.test("service: a channel outage is capped at degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: components({ Gmail: "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assertEquals(out.components!["gmail"].state, "degraded");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: renamed components report unknown rather than a false green", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { components: [{ name: "Something else" }] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: is unsigned and declares the status host separately", () => {
  assertEquals(service.credential ?? "none", "none");
  assertEquals(service.network!.allow, ["www.frontstatus.com"]);
});

Deno.test("quota: reads both the minute allowance and the burst bucket", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { id: "cmp_1" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "80",
      "x-ratelimit-reset": "1787063580",
      "x-ratelimit-burst-limit": "50",
      "x-ratelimit-burst-remaining": "50",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota!.length, 2);
  assertEquals(out.quota![0], {
    id: "requests",
    limit: 100,
    remaining: 80,
    unit: "requests",
    // Epoch SECONDS.
    resetAt: new Date(1787063580 * 1000).toISOString(),
  });
  assertEquals(out.quota![1].id, "burst");
});

/** The burst bucket empties quietly and refills over ten minutes. */
Deno.test("quota: an empty burst bucket is degraded even with a full minute", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { id: "cmp_1" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "99",
      "x-ratelimit-burst-limit": "50",
      "x-ratelimit-burst-remaining": "0",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message!.includes("burst"), out.message);
});

Deno.test("quota: no headers is unknown, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "cmp_1" } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: headroom is informational, not an outage", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
