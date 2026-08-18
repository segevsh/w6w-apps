import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { componentKey, mapComponentStatus, STATUS_URL } from "../../health/service.ts";

const page = (components: Array<[string, string, string?]>) => ({
  status: 200,
  body: {
    page: { name: "1Password" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "g1", name: "USA/Global", status: "operational", group: true },
      { id: "g2", name: "Europe", status: "operational", group: true },
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

Deno.test("service: reads the Statuspage summary unauthenticated", async () => {
  const { ctx, calls } = mockCtx([page([["Sign in", "operational"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

/** The same names repeat in every region group, so keys must be qualified. */
Deno.test("service: component keys are group-qualified, so regions do not collide", async () => {
  const { ctx } = mockCtx([
    page([["Sign in", "major_outage"], ["Sign in", "major_outage", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}).sort(), [
    "europe-sign-in",
    "usa-global-sign-in",
  ]);
});

Deno.test("service: the affected regions are named", async () => {
  const { ctx } = mockCtx([
    page([["Sign in", "operational"], ["Syncing", "major_outage", "g2"]]),
  ]);
  const result = await service.check!({}, ctx);
  assert(/in Europe/.test(result.message!), result.message);
});

/**
 * A Connect server keeps serving its local copy through an outage, so this can
 * never be authoritative for a Connect connection.
 */
Deno.test("service: even a major outage is capped, and says what Connect does", async () => {
  const { ctx } = mockCtx([page([["Syncing", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/keeps serving its vaults/.test(result.message!), result.message);
});

Deno.test("service: only the affected components are reported", async () => {
  const { ctx } = mockCtx([
    page([["Sign in", "operational"], ["Syncing", "partial_outage"]]),
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components ?? {}), ["usa-global-syncing"]);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const status of [404, 503]) {
    const { ctx } = mockCtx([{ status, body: "nope" }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that is not 1Password's is unknown", async () => {
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
  assertEquals(service.network?.allow, ["status.1password.com"]);
});
