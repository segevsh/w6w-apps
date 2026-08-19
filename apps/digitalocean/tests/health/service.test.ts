import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  qualifiedName,
  STATUS_URL,
} from "../../health/service.ts";

/** The real board: 17 groups, and names that repeat across them. */
const page = (
  components: Array<
    { name: string; status: string; group?: boolean; groupId?: string; id?: string }
  >,
) => ({
  status: 200,
  body: {
    page: { name: "DigitalOcean" },
    components: components.map((c, i) => ({
      id: c.id ?? `c${i}`,
      name: c.name,
      status: c.status,
      group: c.group ?? false,
      group_id: c.groupId ?? null,
    })),
  },
});

const healthy = page([
  { name: "API", status: "operational" },
  { name: "Droplets", status: "operational", group: true, id: "g-droplets" },
  { name: "FRA1", status: "operational", groupId: "g-droplets" },
]);

Deno.test("service: reads the summary route", async () => {
  const { ctx, calls } = mockCtx([healthy]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
});

/** The API being out leaves existing droplets serving traffic. */
Deno.test("service: an API outage says the droplets keep running", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "major_outage" },
    { name: "Droplets", status: "operational", group: true, id: "g-droplets" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(
    /every action here fails, and existing droplets keep serving traffic/.test(
      result.message!,
    ),
    result.message,
  );
});

/**
 * The finding this check exists for: 15 components are called `Global` and 13
 * are called `FRA1`, so a bare name identifies nothing.
 */
Deno.test("service: names an affected component by its GROUP and name", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Droplets", status: "operational", group: true, id: "g-droplets" },
    { name: "Volumes", status: "operational", group: true, id: "g-volumes" },
    { name: "FRA1", status: "major_outage", groupId: "g-droplets" },
    { name: "FRA1", status: "operational", groupId: "g-volumes" },
  ])]);
  const result = await service.check!({}, ctx);
  assert(/Droplets \/ FRA1/.test(result.message!), result.message);
  assertEquals(/Volumes \/ FRA1/.test(result.message!), false, "the healthy one is not reported");
});

Deno.test("qualifiedName: resolves a component through its group", () => {
  const byId = new Map([["g1", { id: "g1", name: "Droplets" }]]);
  assertEquals(qualifiedName({ name: "FRA1", group_id: "g1" }, byId), "Droplets / FRA1");
  assertEquals(qualifiedName({ name: "Global", group_id: "g1" }, byId), "Droplets / Global");
  // A top-level component has no group, and its own name is enough.
  assertEquals(qualifiedName({ name: "API", group_id: null }, byId), "API");
  assertEquals(qualifiedName({ name: "X", group_id: "missing" }, byId), "X");
});

/** Groups roll up their children, so counting both would double-count. */
Deno.test("service: a group's own status is not counted alongside its children", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Droplets", status: "major_outage", group: true, id: "g-droplets" },
    { name: "FRA1", status: "major_outage", groupId: "g-droplets" },
  ])]);
  const result = await service.check!({}, ctx);
  // One child, not the child plus its group.
  assert(/1 product\/region component/.test(result.message!), result.message);
});

/** Incidents are one product in one or two regions out of 256 components. */
Deno.test("service: a product outage with a healthy API is degraded, never down", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Droplets", status: "operational", group: true, id: "g-droplets" },
    { name: "FRA1", status: "major_outage", groupId: "g-droplets" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("service: a board with no top-level API component is unknown", async () => {
  const { ctx } = mockCtx([page([
    { name: "Droplets", status: "operational", group: true, id: "g" },
    { name: "API", status: "operational", groupId: "g" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no top-level "API" component/.test(result.message!), result.message);
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

Deno.test("service: maps Statuspage's vocabulary and names the component it needs", () => {
  assertEquals(API_COMPONENT, "API");
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus(undefined), "degraded");
  assert(/a name alone identifies nothing/.test(service.description!), service.description);
});
