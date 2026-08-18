import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: reads Ashby's own components and rolls them up", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "Ashby API", status: "operational" },
    { name: "Scheduling", status: "operational" },
    { name: "Ashby Products", status: "major_outage", group: true },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.ashbyhq.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), ["ashby-api", "scheduling"]);
});

/**
 * The status page lists Ashby's services and the vendors Ashby depends on in
 * the same array. Zoom having an incident is real and is not an Ashby outage.
 */
Deno.test("service: a third-party outage is reported but does not make Ashby down", async () => {
  const { ctx } = mockCtx([page([
    { name: "Ashby API", status: "operational" },
    { name: "Zoom", status: "major_outage" },
    { name: "Google Calendar", status: "degraded_performance" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components!["zoom"].state, "down");
  assert(/not counted/.test(result.message!), result.message);
  assert(/Zoom/.test(result.message!), result.message);
});

Deno.test("service: an Ashby API outage is down", async () => {
  const { ctx } = mockCtx([page([
    { name: "Ashby API", status: "major_outage" },
    { name: "Scheduling", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/Ashby API/.test(result.message!), result.message);
});

Deno.test("service: degraded performance on an Ashby service is degraded", async () => {
  const { ctx } = mockCtx([page([{ name: "Reports API", status: "degraded_performance" }])]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** A status page that itself fails tells us nothing about Ashby. */
Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, shapeless.ctx)).state, "unknown");
});

Deno.test("service: a page naming only third parties cannot produce a verdict", async () => {
  const { ctx } = mockCtx([page([{ name: "Slack", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names any Ashby service/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.ashbyhq.com"]);
});
