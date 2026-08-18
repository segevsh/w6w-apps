import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { componentKey, mapComponentStatus, STATUS_URL } from "../../health/service.ts";

const page = (components: Array<[string, string, string?]>) => ({
  status: 200,
  body: {
    page: { name: "Amplitude" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "g1", name: "Analytics", status: "operational", group: true },
      { id: "g2", name: "Data", status: "operational", group: true },
      ...components.map(([name, status, group], i) => ({
        id: `c${i}`,
        name,
        status,
        group: false,
        group_id: group ?? "g1",
      })),
    ],
  },
});

const allGood = page([
  ["Web Reporting", "operational"],
  ["Data Reception", "operational", "g2"],
  ["Web Application", "operational"],
]);

Deno.test("service: reads the Statuspage summary unauthenticated", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

/**
 * Ingest and query fail independently, and a workflow that only sends does not
 * care about a reporting outage.
 */
Deno.test("service: names the ingest half when Data Reception is affected", async () => {
  const { ctx } = mockCtx([
    page([["Web Reporting", "operational"], ["Data Reception", "major_outage", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/ingest affected/.test(result.message!), result.message);
  assert(!/query/.test(result.message!.split("—")[0]), result.message);
});

Deno.test("service: names the query half when Web Reporting is affected", async () => {
  const { ctx } = mockCtx([
    page([["Web Reporting", "partial_outage"], ["Data Reception", "operational", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/query affected/.test(result.message!), result.message);
});

Deno.test("service: names both when both are affected", async () => {
  const { ctx } = mockCtx([
    page([["Web Reporting", "major_outage"], ["Data Reception", "major_outage", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/ingest and query affected/.test(result.message!), result.message);
});

Deno.test("service: an outage in neither half says so", async () => {
  const { ctx } = mockCtx([page([["Marketing Website", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assert(/neither the ingest nor the query path/.test(result.message!), result.message);
});

/** An app-scoped check cannot know whether a connection sends, reads or both. */
Deno.test("service: even a major outage is capped at degraded", async () => {
  const { ctx } = mockCtx([page([["Data Reception", "major_outage", "g2"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["data-data-reception"].state, "down");
});

/** "Web Application" appears under three products; a name-only key drops two. */
Deno.test("service: component keys are group-qualified, so repeats do not collide", async () => {
  const { ctx } = mockCtx([
    page([["Web Application", "operational"], ["Web Application", "operational", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}).sort(), [
    "analytics-web-application",
    "data-web-application",
  ]);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const status of [404, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that is not Amplitude's is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { page: { name: "Other" }, components: [] } }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/self-identifies/.test(result.message!), result.message);
});

Deno.test("service: an unreachable status host is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: maps Atlassian's vocabulary and falls back on the id", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(componentKey({ id: "abc" }, new Map(), 0), "abc");
  assertEquals(componentKey({}, new Map(), 2), "component-2");
});

Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.amplitude.com"]);
});
