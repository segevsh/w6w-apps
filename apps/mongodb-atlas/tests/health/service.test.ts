import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  SEARCH_COMPONENT,
  STATUS_URL,
} from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { name: "MongoDB Cloud" },
    status: { indicator: "none" },
    components: components.map(([name, status], i) => ({ id: String(i), name, status })),
  },
});

const healthy = page([
  ["MongoDB Cloud", "operational"],
  ["MongoDB Atlas Search", "operational"],
  ["MongoDB Charts", "operational"],
]);

/** Here summary.json is complete — both routes return the same 9 components. */
Deno.test("service: reads the summary route, which is not truncated on this page", async () => {
  const { ctx, calls } = mockCtx([healthy]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
  assert(/says nothing about cluster reachability/.test(result.message!), result.message);
});

/** An outage here stops changes, not queries. */
Deno.test("service: a control-plane outage says what still works", async () => {
  const { ctx } = mockCtx([page([["MongoDB Cloud", "major_outage"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/changes will fail, queries will not/.test(result.message!), result.message);
  assertEquals(result.components!["api"].state, "down");
});

/** Atlas Search is a cluster feature with its own outages. */
Deno.test("service: reports search separately from the control plane", async () => {
  const { ctx } = mockCtx([page([
    ["MongoDB Cloud", "operational"],
    ["MongoDB Atlas Search", "partial_outage"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["search"].state, "degraded");
  assertEquals(result.components!["api"], undefined);
});

/** Charts, App Services and the rest are separate products, not this API. */
Deno.test("service: another product being out is not this app's outage", async () => {
  const { ctx } = mockCtx([page([
    ["MongoDB Cloud", "operational"],
    ["MongoDB Atlas Search", "operational"],
    ["MongoDB Charts", "major_outage"],
    ["MongoDB Atlas App Services and Device Sync", "major_outage"],
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a board without the component is unknown, not ok", async () => {
  const { ctx } = mockCtx([page([["MongoDB Charts", "operational"]])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/is not on the status page/.test(result.message!), result.message);
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

/** A driver reaches a cluster directly; this page does not cover that path. */
Deno.test("service: disclaims cluster reachability, and is informational", () => {
  assertEquals(API_COMPONENT, "MongoDB Cloud");
  assertEquals(SEARCH_COMPONENT, "MongoDB Atlas Search");
  assert(
    /NOTHING about whether your clusters are reachable/.test(service.description!),
    service.description,
  );
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
});
