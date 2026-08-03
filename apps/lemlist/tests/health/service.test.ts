import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: unsigned app-scoped check, widening egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.lempire.com"]);
  assert(!service.network?.allow?.includes("api.lemlist.com"));
});

Deno.test("service: calls status.lempire.com, NOT status.lemlist.com", async () => {
  // status.lemlist.com 302s every path to the lempire ROOT, so the same request
  // there returns 162 KB of HTML instead of status JSON.
  const { ctx, calls } = mockCtx([{ body: { indicator: "up", uptime: "100.000%" } }]);
  await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.lempire.com/status.json");
  assert(!calls[0].url.includes("status.lemlist.com"));
  assert(!calls[0].url.includes("statuspage.io"));
});

Deno.test("service: maps an all-clear rollup to ok and reports the 90-day uptime", async () => {
  const { ctx } = mockCtx([{ body: { indicator: "up", uptime: "100.000%" } }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assert(out.message?.includes("up"));
  assert(out.message?.includes("100.000%"));
});

Deno.test("service: maps Hyperping's documented indicator vocabulary", async () => {
  const cases: Array<[string, string]> = [
    ["up", "ok"],
    ["maintenance", "degraded"],
    ["incident", "degraded"],
    ["outage", "down"],
  ];
  for (const [indicator, state] of cases) {
    const { ctx } = mockCtx([{ body: { indicator, uptime: "99.9%" } }]);
    assertEquals((await service.check!({} as never, ctx)).state, state, indicator);
  }
});

Deno.test("service: an unrecognised indicator reports unknown, and says which", async () => {
  const { ctx } = mockCtx([{ body: { indicator: "wat", uptime: "99.9%" } }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("wat"));
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("503"));
});

Deno.test("service: an HTML body reports unknown rather than crashing", async () => {
  // Exactly what a check pointed at status.lemlist.com would receive.
  const { ctx } = mockCtx([{
    status: 200,
    body: "<!doctype html><html><body>lempire Status</body></html>",
    headers: { "content-type": "text/html" },
  }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("unparseable"));
});

Deno.test("service: omits the uptime note when Hyperping reports N/A", async () => {
  const { ctx } = mockCtx([{ body: { indicator: "up", uptime: "N/A" } }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assert(!out.message?.includes("N/A"));
});

Deno.test("service: reports no components — Hyperping's status.json has no breakdown", async () => {
  const { ctx } = mockCtx([{ body: { indicator: "up", uptime: "100.000%" } }]);
  const out = await service.check!({} as never, ctx);
  assertEquals(out.components, undefined);
});
