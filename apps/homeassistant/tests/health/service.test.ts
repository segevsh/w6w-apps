import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { componentKey, mapComponentStatus, STATUS_URL } from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { name: "Home Assistant" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "g1", name: "Content", status: "operational", group: true },
      ...components.map(([name, status], i) => ({
        id: `c${i}`,
        name,
        status,
        group: false,
      })),
    ],
  },
});

const allGood = page([
  ["Website", "operational"],
  ["Forums", "operational"],
  ["Remote UI", "operational"],
  ["Home Assistant Cloud", "operational"],
]);

Deno.test("service: reads the project's Statuspage summary", async () => {
  const { ctx, calls } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

/** Groups are headings, not services. */
Deno.test("service: group rows are not reported as components", async () => {
  const { ctx } = mockCtx([allGood]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}).length, 4);
  assert(!("content" in (result.components ?? {})), "a group was reported");
});

/**
 * The reason this check exists at all: Remote UI is how most people expose an
 * instance, and when it is down the instance is fine and unreachable.
 */
Deno.test("service: a Remote UI outage is called out specifically", async () => {
  const { ctx } = mockCtx([
    page([["Website", "operational"], ["Remote UI", "major_outage"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded", "capped — this hook cannot know the connection's route");
  assert(/Remote UI or Cloud is affected/.test(result.message!), result.message);
  assert(/nabu.casa hostname/.test(result.message!), result.message);
});

/** The forums being down says nothing about anybody's house. */
Deno.test("service: a non-cloud outage says it does not affect a direct connection", async () => {
  const { ctx } = mockCtx([
    page([["Forums", "major_outage"], ["Remote UI", "operational"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(
    /none of these affect an instance you reach directly/.test(result.message!),
    result.message,
  );
});

/** An app-scoped check cannot know whether a connection goes through Nabu Casa. */
Deno.test("service: even a major outage is capped at degraded", async () => {
  const { ctx } = mockCtx([page([["Home Assistant Cloud", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["home-assistant-cloud"].state, "down");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const status of [404, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that is not Home Assistant's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { name: "Somebody Else" }, components: [] },
  }]);
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

Deno.test("service: maps Atlassian's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: component keys are slugs with an id fallback", () => {
  assertEquals(componentKey({ name: "Home Assistant Cloud" }, 0), "home-assistant-cloud");
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({}, 2), "component-2");
});

/** The page covers the project's infrastructure, not anybody's instance. */
Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.home-assistant.io"]);
  assert(/NOTHING about\s+your instance/.test(service.description!), service.description);
});
