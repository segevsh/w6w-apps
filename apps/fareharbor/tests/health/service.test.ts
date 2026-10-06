import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENTS, mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => service.check!({} as never, ctx);

function summary(overrides: Record<string, string> = {}, pageId = PAGE_ID) {
  const ids = [...Object.keys(API_COMPONENTS), "x-payments", "x-support"];
  return {
    page: { id: pageId, name: "FareHarbor" },
    components: [
      { id: "grp", name: "Online Booking", group: true, status: "operational" },
      ...ids.map((id) => ({
        id,
        name: API_COMPONENTS[id] ?? id,
        status: overrides[id] ?? "operational",
      })),
    ],
  };
}

Deno.test("service: informational, unsigned, declares its status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.fareharbor.com"] });
});

Deno.test("service: all operational is ok, groups are not reported", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://status.fareharbor.com/api/v2/summary.json");
  assertEquals(Object.keys(r.components ?? {}).includes("grp"), false);
  assertEquals(Object.keys(r.components ?? {}).length, 5);
});

Deno.test("service: a deciding component's outage drives the verdict", async () => {
  const major = mockCtx([{ body: summary({ y76b7n56fwt0: "major_outage" }) }]);
  const r = await run(major.ctx);
  assertEquals(r.state, "down");
  assert((r.message ?? "").includes("Booking (major_outage)"));
  const partial = mockCtx([{ body: summary({ "7731wxwfg5yw": "partial_outage" }) }]);
  assertEquals((await run(partial.ctx)).state, "degraded");
});

Deno.test("service: a non-deciding component is reported but cannot make the app down", async () => {
  const { ctx } = mockCtx([{ body: summary({ "x-payments": "major_outage" }) }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["x-payments"].state, "down");
});

Deno.test("service: a failed, unreadable or foreign page is unknown, never down", async () => {
  assertEquals((await run(mockCtx([{ status: 500, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "not json" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: summary({}, "other") }]).ctx)).state, "unknown");
  const none = {
    page: { id: PAGE_ID },
    components: [{ id: "q", name: "Q", status: "operational" }],
  };
  assertEquals((await run(mockCtx([{ body: none }]).ctx)).state, "unknown");
  assertEquals(
    (await run(mockCtx([{ body: { page: { id: PAGE_ID }, components: [] } }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: component vocabulary maps onto four states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});

Deno.test("quota: is a declared absence at informational severity with no hook", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assert((quota.unavailable?.reason ?? "").length > 20);
  assertEquals(quota.check, undefined);
});
