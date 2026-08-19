import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  REGISTRY_COMPONENT,
  STATUS_URL,
} from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { name: "HashiCorp Services" },
    components: components.map(([name, status], i) => ({ id: String(i), name, status })),
  },
});

const healthy = page([
  ["HCP Terraform", "operational"],
  ["Terraform Registry", "operational"],
]);

/**
 * Measured 2026-08-18: summary.json returns 25 of 62 components and HCP
 * Terraform is the 38th by position, so it is not in there at all.
 */
Deno.test("service: reads components.json, because summary.json omits the component", async () => {
  const { ctx, calls } = mockCtx([healthy]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assert(calls[0].url.endsWith("/components.json"), calls[0].url);
  assert(!calls[0].url.includes("summary.json"), calls[0].url);
  assertEquals(result.state, "ok");
});

Deno.test("service: an outage on the API is reported as down", async () => {
  const { ctx } = mockCtx([page([["HCP Terraform", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assertEquals(result.components!["api"].state, "down");
});

/** A plan fetches providers from the registry; that is a separate outage. */
Deno.test("service: a registry outage is reported separately, and explains itself", async () => {
  const { ctx } = mockCtx([page([
    ["HCP Terraform", "operational"],
    ["Terraform Registry", "major_outage"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/plans fail fetching providers/.test(result.message!), result.message);
  assertEquals(result.components!["registry"].state, "down");
  assertEquals(result.components!["api"], undefined);
});

/**
 * The page repeats region names across products — `AWS-us-east-1` appears
 * twice with different ids — so a substring match picks one at random.
 */
Deno.test("service: matches exact names, ignoring the other products' components", async () => {
  const { ctx } = mockCtx([page([
    ["HCP Boundary", "major_outage"],
    ["AWS-us-east-1", "major_outage"],
    ["AWS-us-east-1", "operational"],
    ["HCP Terraform", "operational"],
    ["Terraform Registry", "operational"],
    ["HCP Vault Radar", "major_outage"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok", "another product being down is not this app's outage");
});

/** Reporting healthy off the wrong components is worse than no check. */
Deno.test("service: a page without the component is unknown, not ok", async () => {
  const { ctx } = mockCtx([page([
    ["HCP Boundary", "operational"],
    ["HCP Packer", "operational"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/is not on the status page/.test(result.message!), result.message);
  assert(/reorganised/.test(result.message!), result.message);
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
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus(undefined), "degraded");
});

/** A self-hosted instance is not on HashiCorp's board at all. */
Deno.test("service: names the two components and disclaims Terraform Enterprise", () => {
  assertEquals(API_COMPONENT, "HCP Terraform");
  assertEquals(REGISTRY_COMPONENT, "Terraform Registry");
  assert(/self-hosted Terraform\s+Enterprise/.test(service.description!), service.description);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});
