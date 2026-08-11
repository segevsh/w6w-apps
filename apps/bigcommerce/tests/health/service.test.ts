import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The shape of the real summary.json, trimmed to the rows that matter. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "qbn4dyd29jby", name: "BigCommerce", url: "https://status.bigcommerce.com" },
    components: [
      { id: API_COMPONENT_ID, name: "API & Webhooks", status: "operational", group: false },
      { id: "xfp4knjm938s", name: "Storefront", status: "operational", group: false },
      {
        id: "v6yv04tc26m5",
        name: "Stripe",
        status: "operational",
        group: false,
        group_id: "jtdvghhb6df0",
      },
      { id: "jtdvghhb6df0", name: "3rd Party Services", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("health/service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.bigcommerce.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.bigcommerce.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

Deno.test("health/service: maps the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("health/service: componentKey prefers the vendor id", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "API & Webhooks" }, 3), "api-webhooks-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("health/service: all-clear reports ok and drops the group rows", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  // Three leaf components, no `3rd Party Services` container.
  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assert(!Object.keys(report.components ?? {}).includes("jtdvghhb6df0"));
  assertEquals(report.components?.[API_COMPONENT_ID].message, "API & Webhooks");
});

Deno.test("health/service: the page indicator is the verdict, not the components", async () => {
  // Stripe is down but BigCommerce says `none`. Deriving the verdict from the
  // component list would report BigCommerce down for someone else's outage.
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: API_COMPONENT_ID, name: "API & Webhooks", status: "operational" },
        { id: "v6yv04tc26m5", name: "Stripe", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["v6yv04tc26m5"].state, "down");
  assert(report.message?.includes("Stripe (major_outage)"), report.message);
});

Deno.test("health/service: a real BigCommerce incident degrades the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "major", description: "Partial System Outage" },
      components: [{ id: API_COMPONENT_ID, name: "API & Webhooks", status: "partial_outage" }],
      incidents: [{ name: "Elevated API errors", status: "investigating" }],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("1 open incident(s)"), report.message);
});

Deno.test("health/service: a broken status page is `unknown`, never `down`", async () => {
  for (const response of [{ status: 500, body: "" }, { body: "not json" }]) {
    const { ctx } = mockCtx([response]);
    assertEquals((await service.check!({}, ctx)).state, "unknown");
  }
});

Deno.test("health/service: a page that stops self-identifying is `unknown`", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Something Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer self-identifies"), report.message);
});

Deno.test("health/service: an empty component list is `unknown`", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
