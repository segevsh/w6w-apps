import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  componentKey,
  mapComponentStatus,
  regionOf,
  STATUS_URL,
} from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { name: "New Relic" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "g1", name: "Data Ingest : US", status: "operational", group: true },
      ...components.map(([name, status], i) => ({ id: `c${i}`, name, status, group: false })),
    ],
  },
});

const allGood = page([
  ["APM : US", "operational"],
  ["APM : Europe", "operational"],
  ["Alerts : US", "operational"],
]);

Deno.test("service: reads the Statuspage summary unauthenticated", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["api-key"], undefined);
  assertEquals(result.state, "ok");
  assert(/3 components/.test(result.message!), result.message);
});

/**
 * An account lives in one region, so an incident in another is not an incident
 * for it — and rolling 115 components together would report every one.
 */
Deno.test("service: names the affected regions, which is how you tell if it is yours", async () => {
  const { ctx } = mockCtx([
    page([
      ["APM : US", "operational"],
      ["APM : Europe", "major_outage"],
      ["Alerts : Europe", "partial_outage"],
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/in Europe/.test(result.message!), result.message);
  assert(!/US/.test(result.message!.split("—")[0]), result.message);
});

/** 115 components is not a report — only the affected ones are worth listing. */
Deno.test("service: only the affected components are reported", async () => {
  const { ctx } = mockCtx([
    page([["APM : US", "operational"], ["APM : Europe", "major_outage"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}), ["apm-europe"]);
});

/** An app-scoped check cannot know which region this connection reads. */
Deno.test("service: even a major outage is capped at degraded", async () => {
  const { ctx } = mockCtx([page([["APM : US", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["apm-us"].state, "down");
});

Deno.test("service: group rows are not counted as services", async () => {
  const { ctx } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assert(/3 components/.test(result.message!), "the group heading was counted");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const status of [404, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that is not New Relic's is unknown", async () => {
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

/** Every component on this page carries its region as a suffix. */
Deno.test("service: regionOf reads the suffix New Relic puts on every name", () => {
  assertEquals(regionOf("APM : US"), "US");
  assertEquals(regionOf("Alert Notifications : Europe"), "Europe");
  assertEquals(regionOf("Synthetics : JP"), "JP");
  assertEquals(regionOf("Something Unsuffixed"), undefined);
});

Deno.test("service: maps Atlassian's vocabulary and slugs the names", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(componentKey({ name: "APM Agent : US" }, 0), "apm-agent-us");
  assertEquals(componentKey({}, 3), "component-3");
});

Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.newrelic.com"]);
});
