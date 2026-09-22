import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  slug,
  STATUS_URL,
} from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { id: "abc", name: "Lofty", url: "https://status.lofty.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: components.map(([name, status], i) => ({
      id: `c${i}`,
      name,
      status,
      group: false,
    })),
  },
});

const operational = page([
  ["Lofty", "operational"],
  ["Site", "operational"],
  ["Listing", "operational"],
  ["Dialer", "operational"],
  ["Loftyworks", "operational"],
  ["API", "operational"],
]);

Deno.test("service: reads the Statuspage summary unauthenticated", async () => {
  const { ctx, calls } = mockCtx([operational]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
  assert(/API operational/.test(result.message!), result.message);
});

/** Only the API component is a statement about this app. */
Deno.test("service: a Dialer outage does not drive the API verdict", async () => {
  const { ctx } = mockCtx([
    page([
      ["Lofty", "operational"],
      ["Dialer", "major_outage"],
      ["API", "operational"],
    ]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  // ...but it is still reported as detail.
  assertEquals(result.components!["dialer"].state, "down");
});

Deno.test("service: a degraded API is degraded", async () => {
  const { ctx } = mockCtx([
    page([["Lofty", "operational"], ["API", "degraded_performance"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/API: degraded_performance/.test(result.message!), result.message);
});

Deno.test("service: a major API outage is down", async () => {
  const { ctx } = mockCtx([page([["API", "major_outage"]])]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** Anchored, so a future component name is not silently substituted. */
Deno.test("service: the API component is matched by exact name", () => {
  assertEquals(API_COMPONENT.test("API"), true);
  assertEquals(API_COMPONENT.test("api"), true);
  assertEquals(API_COMPONENT.test("API Gateway"), false);
  assertEquals(API_COMPONENT.test("Public API"), false);
});

Deno.test("service: a page with no `API` component is unknown, not ok", async () => {
  const { ctx } = mockCtx([page([["Lofty", "operational"], ["API Gateway", "operational"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no component named "API"/.test(result.message!), result.message);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const status of [404, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that is not Lofty's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { page: { name: "Someone Else" }, components: [{ name: "API", status: "operational" }] },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/self-identifies/.test(result.message!), result.message);
});

Deno.test("service: a body without components is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { page: { name: "Lofty" } } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreachable status host is unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: maps Statuspage's vocabulary and slugs names", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(slug("Loftyworks"), "loftyworks");
  assertEquals(slug("API"), "api");
});

Deno.test("service: is informational, unsigned, and names only the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.lofty.com"]);
});
