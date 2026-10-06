import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import service, { COMPONENTS_URL, mapComponentStatus, SUMMARY_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (over: Record<string, unknown> = {}) => ({
  page: { name: "SavvyCal", url: "https://savvycal.instatus.com", status: "UP", ...over },
});
const comp = (id: string, name: string, status = "OPERATIONAL", group: unknown = null) => ({
  id,
  name,
  description: "",
  status,
  group,
});
const g = { id: "g1", name: "Calendar Connections" };
const components = (appStatus = "OPERATIONAL", googleStatus = "OPERATIONAL") => ({
  components: [
    comp("a", "App", appStatus),
    comp("m", "Microsoft 365", "OPERATIONAL", g),
    comp("c", "Google Calendar", googleStatus, g),
    comp("g1", "Calendar Connections", googleStatus),
  ],
});

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => (service.check as any)({}, ctx);

Deno.test("service: unsigned, status host only", () => {
  assertEquals(SUMMARY_URL, "https://savvycal.instatus.com/summary.json");
  assertEquals(COMPONENTS_URL, "https://savvycal.instatus.com/components.json");
  assertEquals(service.network?.allow, ["savvycal.instatus.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: all operational is ok, group rows are not double counted", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }, { body: components() }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components).sort(), ["a", "c", "m"]);
  assertEquals(calls.length, 2);
});

Deno.test("service: the App component drives the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary() }, { body: components("MAJOROUTAGE") }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("service: a calendar-connection issue is reported without moving the verdict", async () => {
  const { ctx } = mockCtx([{ body: summary() }, {
    body: components("OPERATIONAL", "PARTIALOUTAGE"),
  }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components.c.state, "degraded");
});

Deno.test("service: a page that is not SavvyCal's is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ name: "Someone Else" }) }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await run(ctx)).state, "unknown");
  const second = mockCtx([{ body: summary() }, { status: 500, body: "" }]);
  assertEquals((await run(second.ctx)).state, "unknown");
});

Deno.test("service: an empty component list is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary() }, { body: { components: [] } }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("mapComponentStatus covers the Instatus vocabulary", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("quota: a declared absence at informational severity", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
