import { assert, assertEquals } from "@std/assert";
import service, {
  COMPONENT_ID,
  mapComponentStatus,
  mapIndicator,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const check = service.check as any;

/** Trimmed from the live response measured 2026-10-05 (903 bytes, 2 components). */
function summary(over: Record<string, unknown> = {}, ds24Status = "operational") {
  return {
    page: { id: PAGE_ID, name: "Digistore24", url: "https://status.digistore24.com" },
    components: [
      { id: COMPONENT_ID, name: "Digistore24", status: ds24Status, group: false },
      { id: "zj7sfn4x4rk0", name: "Digibiz24", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...over,
  };
}

Deno.test("service: probes the status host, not the API host, with no credential", () => {
  assertEquals(STATUS_URL, "https://status.digistore24.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.digistore24.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: operational is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const res = await check({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: reads the Digistore24 component, not the Digibiz24 sibling", async () => {
  const broken = summary({
    components: [
      { id: COMPONENT_ID, name: "Digistore24", status: "operational", group: false },
      { id: "zj7sfn4x4rk0", name: "Digibiz24", status: "major_outage", group: false },
    ],
    status: { indicator: "critical", description: "Major System Outage" },
  });
  const { ctx } = mockCtx([{ body: broken }]);
  assertEquals((await check({}, ctx)).state, "ok");
});

Deno.test("service: component outage maps to down, partial to degraded", async () => {
  const { ctx } = mockCtx([
    { body: summary({}, "major_outage") },
    { body: summary({}, "partial_outage") },
  ]);
  const down = await check({}, ctx);
  assertEquals(down.state, "down");
  assert(down.message.includes("Digistore24: major_outage"));
  assertEquals((await check({}, ctx)).state, "degraded");
});

Deno.test("service: a page that is not Digistore24's is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { id: "other", name: "Digistore24" } }) }]);
  assertEquals((await check({}, ctx)).state, "unknown");
});

Deno.test("service: falls back to the page indicator if the component is gone", async () => {
  const { ctx } = mockCtx([{
    body: summary({ components: [], status: { indicator: "minor", description: "Minor" } }),
  }]);
  assertEquals((await check({}, ctx)).state, "degraded");
});

Deno.test("service: HTTP failure and unreadable body are unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "x" }, { body: "not json" }]);
  assertEquals((await check({}, ctx)).state, "unknown");
  assertEquals((await check({}, ctx)).state, "unknown");
});

Deno.test("service: status vocabularies map", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
