import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT,
  CONNECTIVITY,
  mapComponentStatus,
  STATUS_URL,
} from "../../health/service.ts";

const page = (components: Array<[string, string]>) => ({
  status: 200,
  body: {
    page: { name: "Particle" },
    components: components.map(([name, status], i) => ({ id: String(i), name, status })),
  },
});

const healthy = page([
  ["REST API", "operational"],
  ["Cellular Connectivity", "operational"],
  ["Wi-Fi Connectivity", "operational"],
]);

Deno.test("service: reads the summary route", async () => {
  const { ctx, calls } = mockCtx([healthy]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
});

/** The API being out leaves every device running its firmware. */
Deno.test("service: an API outage says devices are unaffected", async () => {
  const { ctx } = mockCtx([page([
    ["REST API", "major_outage"],
    ["Cellular Connectivity", "operational"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(
    /every action here fails, and devices carry on running their firmware/.test(
      result.message!,
    ),
    result.message,
  );
});

/**
 * The distinction this check exists for: connectivity out, API answering
 * normally, and nothing about the API looking wrong.
 */
Deno.test("service: a connectivity outage says the API will answer normally", async () => {
  const { ctx } = mockCtx([page([
    ["REST API", "operational"],
    ["Cellular Connectivity", "major_outage"],
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded", "the API is fine, so this is not `down`");
  assert(
    /the API will answer normally while those devices are unreachable/.test(result.message!),
    result.message,
  );
});

/** A cellular outage is usually partial, and the names are how you tell. */
Deno.test("service: names the affected hardware families rather than counting them", async () => {
  const { ctx } = mockCtx([page([
    ["REST API", "operational"],
    ["E Series LTE (E402), Boron LTE, B Series B402 SoM", "partial_outage"],
    ["Wi-Fi Connectivity", "operational"],
  ])]);
  const result = await service.check!({}, ctx);
  assert(/Boron LTE/.test(result.message!), result.message);
});

Deno.test("service: unrelated components do not affect the result", async () => {
  const { ctx } = mockCtx([page([
    ["REST API", "operational"],
    ["Cellular Connectivity", "operational"],
    ["community.particle.io", "major_outage"],
    ["store.particle.io", "major_outage"],
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a board without the API component is unknown", async () => {
  const { ctx } = mockCtx([page([["community.particle.io", "operational"]])]);
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

Deno.test("service: the connectivity pattern matches what Particle actually lists", () => {
  assertEquals(API_COMPONENT, "REST API");
  for (
    const name of [
      "Cellular Connectivity",
      "Wi-Fi Connectivity",
      "Ether SIM",
      "2G/3G NorAm",
      "2G/3G EMEA",
      "B Series B523 SoM or Tracker T523 SoM",
    ]
  ) {
    assert(CONNECTIVITY.test(name), name);
  }
  for (const name of ["REST API", "Management Console", "docs.particle.io"]) {
    assertEquals(CONNECTIVITY.test(name), false, name);
  }
});

Deno.test("service: maps Statuspage's vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus(undefined), "degraded");
});
