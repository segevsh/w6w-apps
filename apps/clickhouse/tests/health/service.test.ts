import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";

const page = (components: Array<[string, string]>, description = "All Systems Operational") => ({
  status: 200,
  body: {
    page: { name: "ClickHouse Cloud" },
    status: { indicator: "none", description },
    components: components.map(([name, status], i) => ({ id: String(i), name, status })),
  },
});

Deno.test("service: reads the summary route", async () => {
  const { ctx, calls } = mockCtx([page([["ClickHouse Cloud Services", "operational"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
});

/** An API outage stops provisioning and not queries. */
Deno.test("service: names the control plane when only it is affected", async () => {
  const { ctx } = mockCtx([page([
    ["ClickHouse Cloud API", "major_outage"],
    ["ClickHouse Cloud Services", "operational"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(
    /provisioning and scaling will fail, running services will not/.test(result.message!),
    result.message,
  );
});

/** And a service outage is the other way round. */
Deno.test("service: names the services when they are affected", async () => {
  const { ctx } = mockCtx([page([["ClickHouse Cloud Services", "partial_outage"]])]);
  const result = await service.check!({}, ctx);
  assert(/queries may fail/.test(result.message!), result.message);
  assert(Object.keys(result.components ?? {}).length > 0, "the component is reported");
});

/** Incidents are regional and this check is app-scoped. */
Deno.test("service: never claims a full outage", async () => {
  const { ctx } = mockCtx([page([
    ["ClickHouse Cloud API", "major_outage"],
    ["ClickHouse Cloud Services", "major_outage"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded", "not `down` — the incident may be one region");
  assert(/regional/.test(service.description!), service.description);
});

Deno.test("service: an unrecognised affected component is still reported by name", async () => {
  const { ctx } = mockCtx([page([["Something Else", "partial_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Something Else/.test(result.message!), result.message);
});

Deno.test("service: an empty, broken or unreachable page is unknown", async () => {
  const empty = mockCtx([page([])]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");

  const broken = mockCtx([{ status: 200, body: "<html/>" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");

  const errored = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, errored.ctx)).state, "unknown");

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, offline)).state, "unknown");
});

Deno.test("service: maps Statuspage's vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus(undefined), "degraded");
});

Deno.test("service: is informational and app-scoped", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
});
