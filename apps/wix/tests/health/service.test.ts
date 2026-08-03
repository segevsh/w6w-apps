import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes the Statuspage summary on its own allowlist", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: { indicator: "none" }, components: [] } }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.wix.com/api/v2/summary.json");
  assertEquals(service.kind, "service");
  // The status host is deliberately NOT on the app's egress allowlist.
  assertEquals(service.network, { allow: ["status.wix.com"] });
});

Deno.test("service: maps the rollup indicator to a health state", async () => {
  const cases: Array<[string, string]> = [
    ["none", "ok"],
    ["minor", "degraded"],
    ["major", "down"],
    ["critical", "down"],
    ["something-new", "unknown"],
  ];
  for (const [indicator, expected] of cases) {
    const { ctx } = mockCtx([{ body: { status: { indicator }, components: [] } }]);
    const out = await service.check!({}, ctx);
    assertEquals(out.state, expected, `indicator ${indicator}`);
  }
});

Deno.test("service: keys components by group so Wix's duplicate leaf names never collide", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [
        { id: "g1", name: "Wix Stores", group: true },
        { id: "g2", name: "Wix Video", group: true },
        { id: "c1", name: "Player", status: "operational", group_id: "g1" },
        { id: "c2", name: "Player", status: "major_outage", group_id: "g2" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  // Two distinct products, two distinct keys, neither overwriting the other.
  assertEquals(out.components, {
    "wix-stores-player": { state: "ok" },
    "wix-video-player": { state: "down" },
  });
});

Deno.test("service: suffixes rather than drops a genuine duplicate within one group", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [
        { id: "g1", name: "Group", group: true },
        { id: "c1", name: "API", status: "operational", group_id: "g1" },
        { id: "c2", name: "API", status: "partial_outage", group_id: "g1" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(Object.keys(out.components!).length, 2);
  assertEquals(out.components!["group-api"], { state: "ok" });
  assertEquals(out.components!["group-api-2"], { state: "degraded" });
});

Deno.test("service: does not report group headers as components", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [
        { id: "g1", name: "Site Loading", group: true, status: "operational" },
        { id: "c1", name: "Storefront", status: "operational", group_id: "g1" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(Object.keys(out.components!), ["site-loading-storefront"]);
});

Deno.test("service: maps each Statuspage component status", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor" },
      components: [
        { id: "a", name: "A", status: "operational" },
        { id: "b", name: "B", status: "degraded_performance" },
        { id: "c", name: "C", status: "partial_outage" },
        { id: "d", name: "D", status: "major_outage" },
        { id: "e", name: "E", status: "under_maintenance" },
        { id: "f", name: "F", status: "invented" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.components, {
    a: { state: "ok" },
    b: { state: "degraded" },
    c: { state: "degraded" },
    d: { state: "down" },
    e: { state: "degraded" },
    f: { state: "unknown" },
  });
});

Deno.test("service: a broken status page is `unknown`, never `down`", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes("503"));
});

Deno.test("service: unparseable JSON degrades to unknown instead of throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
