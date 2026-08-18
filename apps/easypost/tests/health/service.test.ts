import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

/**
 * `status.easypost.com` answers 200 with a megabyte of HTML — the real
 * Statuspage is `www.easypoststatus.com`.
 */
Deno.test("service: reads the real status host, not the decoy", () => {
  assertEquals(service.network!.allow, ["www.easypoststatus.com"]);
});

Deno.test("service: EasyPost's own services decide the verdict", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Label Purchases", status: "operational" },
    { name: "Tracking", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://www.easypoststatus.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), ["api", "label-purchases", "tracking"]);
});

/**
 * When FedEx is down EasyPost is fine — you buy a different rate. Naming the
 * carrier is what makes this actionable.
 */
Deno.test("service: a carrier outage is named but does not count", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "FedEx", status: "major_outage" },
    { name: "UPS", status: "partial_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/carriers affected/.test(result.message!), result.message);
  assert(/FedEx/.test(result.message!) && /UPS/.test(result.message!), result.message);
  assertEquals(result.components!["fedex"].state, "down");
});

Deno.test("service: an outage of EasyPost's own API is down", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "major_outage" },
    { name: "FedEx", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/API/.test(result.message!), result.message);
});

Deno.test("service: label purchasing degraded is degraded", async () => {
  const { ctx } = mockCtx([page([{ name: "Label Purchases", status: "degraded_performance" }])]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: component groups are skipped, not counted twice", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "major_outage", group: true },
    { name: "API", status: "operational" },
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** The decoy host produces HTML, which parses to nothing useful. */
Deno.test("service: a page of the wrong shape is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const broken = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");
});

Deno.test("service: a page naming only carriers cannot produce a verdict", async () => {
  const { ctx } = mockCtx([page([{ name: "FedEx", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names EasyPost's own/.test(result.message!), result.message);
});
