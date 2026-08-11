import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  componentKey,
  mapComponentStatus,
  slug,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * The live response measured 2026-08-11: 443 bytes, three components, all
 * `OPERATIONAL` — two of them carrying a stale `description` left over from a
 * past incident, which is exactly why `description` is never read as state.
 */
function components(overrides: Array<Record<string, unknown>> | undefined = undefined) {
  return {
    components: overrides ?? [
      {
        id: "cm7c9roum006wyfi4b75j3k9w",
        name: "Website",
        description: "One of our upstream providers is having a system outage",
        status: "OPERATIONAL",
        group: null,
      },
      {
        id: "cm7c9rouu006yyfi4xhdr1kfq",
        name: "API",
        description: "One of our upstream providers is having a system outage",
        status: "OPERATIONAL",
        group: null,
      },
      {
        id: "cmgzha94i06bjzejaectrpwmv",
        name: "Splitwise Pay",
        description: "",
        status: "OPERATIONAL",
        group: null,
      },
    ],
  };
}

Deno.test("service: probes the Instatus host, unsigned, off the app's own allowlist", () => {
  assertEquals(STATUS_URL, "https://status.splitwise.com/v2/components.json");
  assertEquals(service.network?.allow, ["status.splitwise.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});

/**
 * `/api/v2/summary.json` on this host is an Instatus alias that is
 * byte-identical to `/summary.json` — NOT the Atlassian schema. A probe pointed
 * there would read `status.indicator`, find nothing, and report unknown
 * forever.
 */
Deno.test("service: does not use the Statuspage-shaped path this host also serves", () => {
  assert(!STATUS_URL.includes("/api/v2/"), "pointed at the Instatus alias of the Statuspage path");
  assert(!STATUS_URL.includes("statuspage.io"), "pointed at the unclaimed Atlassian page");
});

Deno.test("service: an all-operational page reports ok with every component named", async () => {
  const { ctx, calls } = mockCtx([{ body: components() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assertEquals(report.components?.["cm7c9rouu006yyfi4xhdr1kfq"]?.message, "API");
});

/**
 * The verdict follows the `API` component alone. Splitwise's marketing site
 * being down is not this app's problem, and folding it in would fail every
 * workflow over a broken landing page.
 */
Deno.test("service: a Website outage is reported but does not move the verdict", async () => {
  const body = components();
  body.components[0].status = "MAJOROUTAGE";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.components?.["cm7c9roum006wyfi4b75j3k9w"]?.state, "down");
  assert(
    /not affecting the API: Website \(MAJOROUTAGE\)/.test(report.message ?? ""),
    report.message,
  );
});

Deno.test("service: an API outage is the verdict", async () => {
  const body = components();
  body.components[1].status = "MAJOROUTAGE";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/API: MAJOROUTAGE/.test(report.message ?? ""), report.message);
});

Deno.test("service: a degraded API is degraded, not down", async () => {
  const body = components();
  body.components[1].status = "DEGRADEDPERFORMANCE";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/**
 * A stale `description` must never be read as state — on the live page two
 * OPERATIONAL components carried "One of our upstream providers is having a
 * system outage".
 */
Deno.test("service: an alarming description on an OPERATIONAL component is ignored", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(
    !JSON.stringify(report).includes("upstream providers"),
    "the stale description leaked into the report",
  );
});

/** Renamed or regrouped: say so rather than silently using another component. */
Deno.test("service: a missing API component reports unknown and names what it found", async () => {
  const { ctx } = mockCtx([{
    body: components([{ id: "a", name: "Website", status: "OPERATIONAL" }]),
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/no longer publishes an "API" component/.test(report.message ?? ""), report.message);
  assert(/Website/.test(report.message ?? ""), report.message);
});

/** A broken status page says nothing about Splitwise — never `down`. */
Deno.test("service: a failing status page reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable or component-less body reports unknown", async () => {
  const html = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");

  const empty = mockCtx([{ body: components([]) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");

  const wrong = mockCtx([{ body: { page: { status: "UP" } } }]);
  const report = await service.check!({}, wrong.ctx);
  assertEquals(report.state, "unknown");
  assert(/no component list/.test(report.message ?? ""), report.message);
});

Deno.test("service: Instatus's vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("MINOROUTAGE"), "degraded");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  // A vocabulary that grew is a thing to notice, not to round down to `ok`.
  assertEquals(mapComponentStatus("SOMETHING_NEW"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
  // Instatus's enum is upper-case; the Statuspage spelling must not map.
  assertEquals(mapComponentStatus("operational"), "unknown");
});

Deno.test("service: componentKey prefers the vendor id and falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Splitwise Pay" }, 3), "splitwise-pay-3");
  assertEquals(componentKey({}, 7), "component-7");
  assertEquals(slug("API (v3.0)"), "api-v3-0");
});

Deno.test("service: the API component name is pinned", () => {
  assertEquals(API_COMPONENT, "API");
});
