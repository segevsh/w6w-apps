import { assert, assertEquals } from "@std/assert";
import service, {
  AVAILABILITY_COMPONENT,
  componentState,
  findComponent,
  indicatorState,
  NOT_THE_REST_API_GROUP,
  slug,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * A trimmed copy of the real `status.kajabi.com/api/v2/summary.json`, fetched
 * 2026-08-03 — including the group structure that makes the `API` group a trap.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "rqkb85mpqyr3", name: "Kajabi", url: "https://status.kajabi.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "sh9xbcyzjks9", name: "App Availability", status: "operational", group: false },
      { id: "6ht1c6z0fty9", name: "API", status: "operational", group: true },
      {
        id: "q3wvwm5xf3lq",
        name: "Inbound Webhooks",
        status: "operational",
        group: false,
        group_id: "6ht1c6z0fty9",
      },
      { id: "5zvrcgvhz9gk", name: "Checkout", status: "operational", group: true },
      {
        id: "b19tgnwhqqs7",
        name: "Offer Checkout",
        status: "operational",
        group: false,
        group_id: "5zvrcgvhz9gk",
      },
      { id: "2jbr1x25pc5j", name: "Sites", status: "operational", group: true },
      {
        id: "hqks92cq1qyx",
        name: "Page rendering",
        status: "operational",
        group: false,
        group_id: "2jbr1x25pc5j",
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the canonical Kajabi status page", () => {
  assertEquals(STATUS_URL, "https://status.kajabi.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.kajabi.com"]);
});

Deno.test("service: reports ok when App Availability is operational", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assert(res.components!["app-availability"]);
});

Deno.test("service: an outage on App Availability is reported as down", async () => {
  const s = summary();
  s.components[0].status = "major_outage";
  const { ctx } = mockCtx([{ body: s }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "down");
});

Deno.test("service: degraded performance maps to degraded", async () => {
  const s = summary();
  s.components[0].status = "degraded_performance";
  const { ctx } = mockCtx([{ body: s }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/**
 * THE central regression test for this app's health surface.
 *
 * Kajabi's status page has a component group literally named `API`, which
 * contains only *Inbound Webhooks* — the Zapier-style webhook receiver, a
 * different surface from the public REST API this app calls. Narrowing to it
 * (the obvious move, and what the sibling `circle` app does with its genuinely
 * correct *Developer API* group) would report the health of a feature no action
 * here touches.
 *
 * This pins that an Inbound Webhooks outage does NOT move the verdict.
 */
Deno.test("service: an Inbound Webhooks outage does not move the verdict", async () => {
  const s = summary();
  // The leaf inside the `API` group, and the group header itself.
  s.components[1].status = "major_outage";
  s.components[2].status = "major_outage";
  const { ctx } = mockCtx([{ body: s }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok", "the `API` group leaked into the verdict");
  // …but it is still reported, so nothing is hidden from an operator.
  assertEquals(res.components!["inbound-webhooks"].state, "down");
  assert(res.message!.includes("inbound-webhooks"));
});

/** Surfaces this app never touches must not drive the verdict either. */
Deno.test("service: a page-rendering outage does not move the verdict", async () => {
  const s = summary();
  s.components[6].status = "major_outage";
  const { ctx } = mockCtx([{ body: s }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "ok");
  assertEquals(res.components!["page-rendering"].state, "down");
});

Deno.test("service: group headers are excluded from the component report", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const res = await service.check!({}, ctx);
  // `API`, `Checkout` and `Sites` are groups — they restate their children.
  assert(!("api" in res.components!));
  assert(!("checkout" in res.components!));
  assert(!("sites" in res.components!));
});

/**
 * A renamed or removed component must fail loudly. A silent fallback would mean
 * the check quietly stops meaning what it says it means.
 */
Deno.test("service: falls back loudly when App Availability disappears", async () => {
  const s = summary({ status: { indicator: "minor", description: "Partial degradation" } });
  s.components = s.components.filter((c) => c.name !== "App Availability");
  const { ctx } = mockCtx([{ body: s }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "degraded", "did not fall back to the platform indicator");
  assert(res.message!.includes("no `App Availability` component"));
});

Deno.test("service: open incidents and maintenance windows are surfaced in the message", async () => {
  const { ctx } = mockCtx([{
    body: summary({ incidents: [{}, {}], scheduled_maintenances: [{}] }),
  }]);
  const res = await service.check!({}, ctx);
  assert(res.message!.includes("2 open incident(s)"));
  assert(res.message!.includes("1 scheduled maintenance window(s)"));
});

/** A status page that itself fails says nothing about Kajabi. */
Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "nope" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const { ctx: ctx2 } = mockCtx([{ status: 200, body: "not json" }]);
  assertEquals((await service.check!({}, ctx2)).state, "unknown");
});

Deno.test("service: a summary with no named components is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const res = await service.check!({}, ctx);
  assertEquals(res.state, "unknown");
});

// ------------------------------------------------------------- primitives --

Deno.test("slug: stable component selectors", () => {
  assertEquals(slug("App Availability"), "app-availability");
  assertEquals(slug("Custom Email Domain Setup (CEDS)"), "custom-email-domain-setup-ceds");
});

Deno.test("componentState / indicatorState: the Statuspage vocabularies", () => {
  assertEquals(componentState("operational"), "ok");
  assertEquals(componentState("partial_outage"), "degraded");
  assertEquals(componentState("major_outage"), "down");
  assertEquals(componentState("who_knows"), "unknown");
  assertEquals(indicatorState("none"), "ok");
  assertEquals(indicatorState("critical"), "down");
  assertEquals(indicatorState(undefined), "unknown");
});

Deno.test("findComponent: matches case-insensitively and never matches a group", () => {
  const all = summary().components;
  assertEquals(findComponent(all, "app availability")?.id, "sh9xbcyzjks9");
  // `API` is a group header — it must not be matchable as a leaf.
  assertEquals(findComponent(all, NOT_THE_REST_API_GROUP), undefined);
  assertEquals(findComponent(all, "Nothing Here"), undefined);
  assertEquals(AVAILABILITY_COMPONENT, "App Availability");
});
