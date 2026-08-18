import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (indicator: string, components: unknown[] = []) => ({
  status: { indicator, description: "All Systems Operational" },
  components,
});

Deno.test("service: declares the status host on its own allowlist, not the app's", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["www.vercel-status.com"]);
});

Deno.test("service: an operational rollup is ok, with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: summary("none", [
      { name: "Edge Network", status: "operational" },
      { name: "Builds & Deployments", status: "degraded_performance" },
      { name: "Group header", status: "operational", group: true },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://www.vercel-status.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, {
    "edge-network": { state: "ok" },
    "builds-deployments": { state: "degraded" },
  });
});

Deno.test("service: minor degrades, major and critical are down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([{ status: 200, body: summary(indicator) }]);
    assertEquals((await service.check!({} as never, ctx)).state, state, indicator);
  }
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(result.message, "status API returned 503");
});
