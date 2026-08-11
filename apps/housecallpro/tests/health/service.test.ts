import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  PARTNER_JOBS_COMPONENT,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The nineteen components measured on the live page on 2026-08-11. */
const LIVE_COMPONENTS = [
  "Pro web",
  "Payment processing - Stripe",
  "QuickBooks Online",
  "QuickBooks Desktop",
  "Text notifications",
  "Email notifications",
  "Online booking",
  "Google calendar",
  "Consumer web",
  "Add a job API",
  "iOS Mobile App",
  "Android mobile app",
  "Customer job preview",
  "Wisetack",
  "Responsibid",
  "Reviews",
  "Voice",
  "Chat",
  "CSR AI",
];

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "b9cs969t77x0", name: "Housecall Pro", url: "https://status.housecallpro.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: LIVE_COMPONENTS.map((name, i) => ({
      id: `id-${i}`,
      name,
      status: "operational",
    })),
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: reads summary.json on the status host, not on the API host", () => {
  assertEquals(STATUS_URL, "https://status.housecallpro.com/api/v2/summary.json");
  assertEquals(service.network?.allow, [STATUS_HOST]);
  assertEquals(service.credential, "none");
});

/**
 * The point of the whole check. None of the nineteen components covers
 * `api.housecallpro.com`, and the one whose name contains "API" is the separate
 * Partner Jobs intake surface — so this reading must never move the app's
 * verdict.
 */
Deno.test("service: is informational, because no component covers the public API", () => {
  assertEquals(service.severity, "informational");
  assertEquals(LIVE_COMPONENTS.filter((n) => /api/i.test(n)), [PARTNER_JOBS_COMPONENT]);
  assertEquals(LIVE_COMPONENTS.some((n) => /housecallpro\.com/i.test(n)), false);
});

Deno.test("service: reports every component and labels the Partner Jobs one", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const out = await service.check!({} as never, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).length, 19);
  const partner = out.components!["id-9"];
  assert(partner.message!.includes("Partner Jobs intake — not the public API"));
});

Deno.test("service: the page indicator is the verdict, not the component roll-up", async () => {
  const { ctx } = mockCtx([{
    body: summary({ status: { indicator: "critical", description: "Major outage" } }),
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "down");
});

Deno.test("service: an affected component is named in the message", async () => {
  const body = summary();
  (body.components[0] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body: { ...body, status: { indicator: "major" } } }]);
  const out = await service.check!({} as never, ctx);

  assertEquals(out.state, "degraded");
  assert(out.message!.includes("Pro web (major_outage)"));
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  for (const response of [{ status: 503, body: "" }, { status: 200, body: "not json" }]) {
    const { ctx } = mockCtx([response]);
    assertEquals((await service.check!({} as never, ctx)).state, "unknown");
  }
});

Deno.test("service: a page that stops self-identifying is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes("no longer self-identifies"));
});

Deno.test("service: an empty component list is unknown rather than a vacuous ok", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: group container rows are not double-counted", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "g", name: "Storage", group: true, status: "operational" },
        { id: "c", name: "Child", status: "operational" },
      ],
    }),
  }]);
  assertEquals(Object.keys((await service.check!({} as never, ctx)).components ?? {}), ["c"]);
});

Deno.test("service: the Statuspage vocabularies map as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: a component without an id still gets a stable key", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Pro web" }, 3), "pro-web-3");
  assertEquals(componentKey({}, 7), "component-7");
});
