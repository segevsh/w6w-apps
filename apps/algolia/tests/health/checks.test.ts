import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

const status = (clusters: Record<string, string>) => ({ status: clusters });

Deno.test("service: probes Algolia's own status API, not the decoy Statuspage paths", () => {
  assertEquals(service.network?.allow, ["status.algolia.com"]);
  assertEquals(service.kind, "service");
});

Deno.test("service: all clusters operational is ok, and says how many", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: status({ "c1-br": "operational", "c1-de": "operational" }),
  }]);
  const result = await service.check!({} as never, ctx);
  // /1/status — the /api/v2/*.json paths return the page's HTML shell.
  assertEquals(calls[0].url, "https://status.algolia.com/1/status");
  assertEquals(result.state, "ok");
  assertEquals(result.message, "all 2 clusters operational");
});

Deno.test("service: a major outage on any cluster is down, and names it", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: status({ "c1-br": "operational", "c23-usw": "major_outage" }),
  }]);
  const result = await service.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "down");
  assert(result.message.includes("c23-usw: major_outage"), result.message);
  assert(result.message.includes("1 of 2"), result.message);
});

/** The vocabulary came from live data; anything else is reported, not ignored. */
Deno.test("service: an unrecognised cluster state degrades rather than passing", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: status({ "c1-br": "operational", "c2-eu": "some_new_state" }),
  }]);
  const result = await service.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "degraded");
  assert(result.message.includes("some_new_state"), result.message);
});

Deno.test("service: many affected clusters are summarised, not dumped", async () => {
  const clusters: Record<string, string> = {};
  for (let i = 0; i < 12; i++) clusters[`c${i}-x`] = "major_outage";
  const { ctx } = mockCtx([{ status: 200, body: status(clusters) }]);
  const result = await service.check!({} as never, ctx) as { message: string };
  assert(result.message.includes("+7 more"), result.message);
});

Deno.test("service: a broken or misshaped status API is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, failed.ctx)).state, "unknown");
  const weird = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({} as never, weird.ctx)).state, "unknown");
  const empty = mockCtx([{ status: 200, body: status({}) }]);
  assertEquals((await service.check!({} as never, empty.ctx)).state, "unknown");
});

Deno.test("quota: is a declared absence — plan quota lives on the dashboard", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("no response headers"));
  assertEquals(quota.severity, "informational");
});
