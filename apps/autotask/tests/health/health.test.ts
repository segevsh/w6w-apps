import { assert, assertEquals } from "@std/assert";
import service, { GROUP_ID, mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const child = (id: string, status = "operational") => ({
  id,
  name: `Region ${id}`,
  status,
  group: false,
  group_id: GROUP_ID,
});
const feed = (components: unknown[], id = PAGE_ID) => ({ page: { id }, components });
const runService = (body: unknown) => service.check!({} as never, mockCtx([{ body }]).ctx);

Deno.test("service: allowlists only the status host, unsigned", () => {
  assertEquals(service.network, { allow: ["status.kaseya.com"] });
  assertEquals(service.credential, "none");
});

Deno.test("mapComponentStatus: the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
});

Deno.test("service: all regions operational is ok and reports every child", async () => {
  const r = await runService(feed([child("a"), child("b")]));
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).length, 2);
});

Deno.test("service: one affected region is degraded, not down — the feed cannot say whose it is", async () => {
  const r = await runService(feed([child("a", "major_outage"), child("b")]));
  assertEquals(r.state, "degraded");
  assert(r.message!.includes("Region a"));
});

Deno.test("service: every region in a major outage is down", async () => {
  assertEquals(
    (await runService(feed([child("a", "major_outage"), child("b", "major_outage")]))).state,
    "down",
  );
});

Deno.test("service: other Kaseya products and group rows never move the verdict", async () => {
  const r = await runService(feed([
    child("a"),
    { id: "x", name: "SaaS Alerts API", status: "major_outage", group_id: "other" },
    { id: GROUP_ID, name: "Autotask PSA", status: "major_outage", group: true, group_id: null },
  ]));
  assertEquals(r.state, "ok");
});

Deno.test("service: a different page id, an empty group and a broken feed are unknown", async () => {
  assertEquals((await runService(feed([child("a")], "someone-else"))).state, "unknown");
  assertEquals((await runService(feed([]))).state, "unknown");
  const broken = await service.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx);
  assertEquals(broken.state, "unknown");
});

Deno.test("api: declares an unsigned app-level dependency probe on the discovery host", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "none");
  assertEquals(api.network, { allow: ["webservices.autotask.net"] });
});

Deno.test("api: the vendor's own 500 errors envelope is a PASS; an HTML 500 and a bare 502 are down", async () => {
  const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);
  assertEquals(
    (await run([{ status: 500, body: { errors: ["Zone information could not be determined"] } }]))
      .state,
    "ok",
  );
  assertEquals(
    (await run([{ body: { zoneName: "America East", url: "u", webUrl: "w", ci: 1 } }])).state,
    "ok",
  );
  assertEquals((await run([{ status: 500, body: "<html>", headers: {} }])).state, "down");
  assertEquals((await run([{ status: 502, body: { message: "bad gateway" } }])).state, "down");
  assertEquals((await run([{ body: { hello: 1 } }])).state, "unknown");
});

Deno.test("quota: signed, connection-scoped, reads the zone's ThresholdInformation", async () => {
  assertEquals(quota.credential, "signed");
  const { ctx, calls } = mockCtx([{
    body: {
      externalRequestThreshold: 10000,
      requestThresholdTimeframe: 60,
      currentTimeframeRequestCount: 1000,
    },
  }], { display: { zone: "14" } });
  const r = await quota.check!({} as never, ctx);
  assertEquals(
    calls[0].url,
    "https://webservices14.autotask.net/atservicesrest/V1.0/ThresholdInformation",
  );
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "requests", limit: 10000, remaining: 9000, unit: "requests" }]);
});

Deno.test("quota: 80% is degraded, the ceiling is degraded, a refusal or no zone is unknown", async () => {
  const at = (used: number) =>
    mockCtx([{ body: { externalRequestThreshold: 100, currentTimeframeRequestCount: used } }], {
      display: { zone: "2" },
    });
  assertEquals((await quota.check!({} as never, at(80).ctx)).state, "degraded");
  const full = await quota.check!({} as never, at(100).ctx);
  assertEquals(full.state, "degraded");
  assertEquals(full.quota![0].remaining, 0);
  const denied = mockCtx([{ status: 401, body: "" }], { display: { zone: "2" } });
  assertEquals((await quota.check!({} as never, denied.ctx)).state, "unknown");
  assertEquals((await quota.check!({} as never, mockCtx([]).ctx)).state, "unknown");
  const odd = mockCtx([{ body: {} }], { display: { zone: "2" } });
  assertEquals((await quota.check!({} as never, odd.ctx)).state, "unknown");
});
