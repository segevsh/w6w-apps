import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, {
  API_COMPONENT_ID,
  findApiComponent,
  mapComponentStatus,
} from "../../health/service.ts";

/** A minimal status.smartsuite.com summary with both regional API components. */
function summary(apiUsStatus: string) {
  return {
    page: { id: "abc", name: "SmartSuite", url: "https://status.smartsuite.com" },
    components: [
      { id: API_COMPONENT_ID, name: "API US", status: apiUsStatus },
      { id: "6ly03chn3njc", name: "API EU", status: "major_outage" },
      { id: "grp", name: "Group", status: apiUsStatus, group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("service: finds API US by id, then by exact name — never matching API EU", () => {
  assertEquals(findApiComponent([{ id: API_COMPONENT_ID, name: "renamed" }])?.id, API_COMPONENT_ID);
  assertEquals(findApiComponent([{ id: "x", name: "api us" }])?.id, "x");
  assertEquals(findApiComponent([{ id: "6ly03chn3njc", name: "API EU" }]), undefined);
});

Deno.test("service: verdict follows API US, not the page or API EU", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.smartsuite.com/api/v2/summary.json");
  // API EU is a major outage in this fixture; it must NOT drive the verdict.
  assertEquals(report.state, "ok");
  assertEquals(report.components?.[API_COMPONENT_ID]?.state, "ok");
  assertEquals(report.components?.["6ly03chn3njc"]?.state, "down");
});

Deno.test("service: degraded and major-outage API US states come through", async () => {
  const degraded = await service.check!(
    {},
    mockCtx([{ body: summary("degraded_performance") }]).ctx,
  );
  assertEquals(degraded.state, "degraded");
  const down = await service.check!({}, mockCtx([{ body: summary("major_outage") }]).ctx);
  assertEquals(down.state, "down");
});

Deno.test("service: a missing API US component is unknown, not down", async () => {
  const { ctx } = mockCtx([{ body: { page: summary("ok").page, components: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a status API failure is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "nope" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as SmartSuite is unknown", async () => {
  const body = summary("operational");
  body.page.url = "https://status.example.com";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: declares the status host on its own allowlist, unsigned", () => {
  assertEquals(service.network?.allow, ["status.smartsuite.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});
