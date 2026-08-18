import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: reads the API and integrations components", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "Vanta Public API", status: "operational" },
    { name: "Core App", status: "operational" },
    { name: "3rd Party Integrations", status: "operational" },
    { name: "Vanta Web App", status: "operational", group: true },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.vanta.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assert(Object.keys(result.components!).includes("vanta-public-api"));
});

/**
 * The interesting case: an integrations outage does not stop the API answering
 * — it makes the answers stale, which is a degradation, not an outage.
 */
Deno.test("service: an integrations outage is capped at degraded and explained", async () => {
  const { ctx } = mockCtx([page([
    { name: "Vanta Public API", status: "operational" },
    { name: "3rd Party Integrations", status: "major_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components!["3rd-party-integrations"].state, "degraded");
  assert(/going stale/.test(result.message!), result.message);
});

Deno.test("service: an API outage is down at full weight", async () => {
  const { ctx } = mockCtx([page([
    { name: "Vanta Public API", status: "major_outage" },
    { name: "3rd Party Integrations", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/Vanta Public API/.test(result.message!), result.message);
});

/** Trust Center and the rest are surfaces this app never touches. */
Deno.test("service: product surfaces this app does not use are reported, not counted", async () => {
  const { ctx } = mockCtx([page([
    { name: "Vanta Public API", status: "operational" },
    { name: "Trust Center", status: "major_outage" },
    { name: "Vanta AI", status: "major_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components!["trust-center"].state, "down");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, shapeless.ctx)).state, "unknown");
});

Deno.test("service: a page naming none of the watched components says so", async () => {
  const { ctx } = mockCtx([page([{ name: "Trust Center", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.vanta.com"]);
});
