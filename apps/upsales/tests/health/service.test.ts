import { assert, assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: PAGE_ID, name: "Upsales", url: "https://status.upsales.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "1gr032v9zz1j", name: "Upsales App", status: "operational", group: false },
      { id: "357mcybkpg11", name: "Mail Events", status: "operational", group: false },
      { id: "ywy80h6q6x9n", name: "Email", status: "operational", group: true },
    ],
    incidents: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host with no credential", () => {
  assertEquals(STATUS_URL, "https://status.upsales.com/api/v2/summary.json");
  assertEquals(service.credential, "none");
  assertEquals(service.severity, "informational");
});

Deno.test("service: all operational reports ok and skips group rows", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}).sort(), ["1gr032v9zz1j", "357mcybkpg11"]);
});

Deno.test("service: a minor indicator is degraded and names the affected component", async () => {
  const body = summary({
    status: { indicator: "minor", description: "Minor Service Outage" },
    components: [{ id: "a", name: "Upsales App", status: "partial_outage" }],
    incidents: [{}],
  });
  const { ctx } = mockCtx([{ body }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Upsales App (partial_outage)"));
  assert(r.message?.includes("1 open incident"));
});

Deno.test("service: a critical indicator is down", async () => {
  const { ctx } = mockCtx([{ body: summary({ status: { indicator: "critical" } }) }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a page that is not Upsales' is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { id: "zzz", name: "Other" } }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a non-200 or unreadable page is unknown, never down", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 500, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await service.check!({}, mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});

Deno.test("service: no components is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: status vocabularies map", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
