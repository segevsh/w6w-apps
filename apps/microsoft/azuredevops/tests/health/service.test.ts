import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const health = (services: Array<{ id: string; geos: Record<string, string> }>) => ({
  status: 200,
  body: {
    status: { health: "healthy" },
    services: services.map((s) => ({
      id: s.id,
      geographies: Object.entries(s.geos).map(([id, h]) => ({ id, name: id, health: h })),
    })),
  },
});

const allHealthy = { US: "healthy", EU: "healthy", APAC: "healthy" };

Deno.test("service: reads the services this app uses, by name", async () => {
  const { ctx, calls } = mockCtx([health([
    { id: "Core services", geos: allHealthy },
    { id: "Repos", geos: allHealthy },
    { id: "Pipelines", geos: allHealthy },
    { id: "Boards", geos: allHealthy },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.dev.azure.com/_apis/status/health");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), [
    "boards",
    "core-services",
    "pipelines",
    "repos",
  ]);
});

/** Surfaces this app never calls do not count. */
Deno.test("service: Test Plans and Artifacts are ignored", async () => {
  const { ctx } = mockCtx([health([
    { id: "Repos", geos: allHealthy },
    { id: "Test Plans", geos: { US: "unhealthy" } },
    { id: "Artifacts", geos: { US: "unhealthy" } },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components!["test-plans"], undefined);
});

/** A disruption in one region is named rather than reported as everywhere. */
Deno.test("service: a partial-geography outage names the regions affected", async () => {
  const { ctx } = mockCtx([health([
    { id: "Repos", geos: { US: "healthy", EU: "degraded", BR: "degraded" } },
    { id: "Pipelines", geos: allHealthy },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Repos in EU, BR/.test(result.message!), result.message);
  assertEquals(result.components!["repos"].message, "affected: EU, BR");
});

Deno.test("service: unhealthy is down and degraded is degraded", async () => {
  const down = mockCtx([health([{ id: "Pipelines", geos: { US: "unhealthy" } }])]);
  assertEquals((await service.check!({}, down.ctx)).state, "down");

  const advisory = mockCtx([health([{ id: "Pipelines", geos: { US: "advisory" } }])]);
  assertEquals((await service.check!({}, advisory.ctx)).state, "degraded");
});

Deno.test("service: a broken or shapeless status endpoint is unknown, never down", async () => {
  const broken = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { status: {} } }]);
  assertEquals((await service.check!({}, shapeless.ctx)).state, "unknown");
});

Deno.test("service: an endpoint naming none of the used services says so", async () => {
  const { ctx } = mockCtx([health([{ id: "Artifacts", geos: allHealthy }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names the services/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.dev.azure.com"]);
});
