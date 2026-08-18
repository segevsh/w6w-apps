import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { isOpen, mapImpact, serviceKey, STATUS_URL } from "../../health/service.ts";

const closed = {
  id: "a",
  service_name: "Places API",
  status_impact: "SERVICE_DISRUPTION",
  begin: "2026-01-01T00:00:00+00:00",
  end: "2026-01-01T02:00:00+00:00",
};
const open = {
  id: "b",
  service_name: "Routes API",
  status_impact: "SERVICE_OUTAGE",
  begin: "2026-08-18T09:00:00+00:00",
  external_desc: "Elevated error rates computing routes",
};

/**
 * The Cloud-wide feed contains no Maps products at all — verified live. Reading
 * it here would produce a check that was permanently green for the wrong product.
 */
Deno.test("service: reads the Maps-specific feed, not the Cloud-wide one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [closed] }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assert(calls[0].url.includes("/maps-platform/"), calls[0].url);
});

Deno.test("service: a history with nothing open is healthy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [closed, { ...closed, id: "c" }] }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/no open incidents/.test(result.message!), result.message);
});

/** An incident with no `end` has not been closed — that is the whole state signal. */
Deno.test("service: an incident with no end is open, and names the service", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [closed, open] }]);
  const result = await service.check!({}, ctx);
  assert(/Routes API/.test(result.message!), result.message);
  assertEquals(Object.keys(result.components ?? {}), ["routes-api"]);
});

/**
 * Capped: this hook has no connection, so it cannot know whether the affected
 * API is one the workflow calls.
 */
Deno.test("service: even a SERVICE_OUTAGE is capped at degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [open] }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["routes-api"].state, "down");
});

Deno.test("service: a broken feed is unknown, never down", async () => {
  for (const status of [404, 500]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a feed that is not an array is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { incidents: [] } }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/JSON array/.test(result.message!), result.message);
});

Deno.test("service: an unreachable status host is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: maps Google's status_impact vocabulary", () => {
  assertEquals(mapImpact("SERVICE_OUTAGE"), "down");
  assertEquals(mapImpact("SERVICE_DISRUPTION"), "degraded");
  assertEquals(mapImpact("SERVICE_INFORMATION"), "degraded");
  assertEquals(mapImpact(undefined), "unknown");
});

Deno.test("service: isOpen is exactly 'has no end'", () => {
  assert(isOpen({ begin: "x" }));
  assert(!isOpen({ begin: "x", end: "y" }));
});

Deno.test("service: component keys are slugs, with an id fallback", () => {
  assertEquals(serviceKey({ service_name: "Address Validation API" }, 0), "address-validation-api");
  assertEquals(serviceKey({ id: "abc" }, 0), "abc");
  assertEquals(serviceKey({}, 2), "incident-2");
});

Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.cloud.google.com"]);
});
