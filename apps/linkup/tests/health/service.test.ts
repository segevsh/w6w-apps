import { assertEquals } from "@std/assert";
import service, { mapMonitorStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function page(statuses: Record<string, string>, title = "Linkup") {
  return {
    title,
    monitors: Object.entries(statuses).map(([name, status], i) => ({ id: i, name, status })),
  };
}
const ALL = {
  "Search API": "success",
  "Application": "success",
  "MCP Server": "success",
  "Fetch API": "success",
};

Deno.test("service: all monitors operational is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: page(ALL) }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://status.linkup.so/feed/json");
  assertEquals(Object.keys(r.components!), [
    "search-api",
    "application",
    "mcp-server",
    "fetch-api",
  ]);
});

Deno.test("service: the Search or Fetch API monitor drives the verdict", async () => {
  const down = await service.check!(
    {},
    mockCtx([{ body: page({ ...ALL, "Fetch API": "error" }) }]).ctx,
  );
  assertEquals(down.state, "down");
  assertEquals(down.components?.["fetch-api"]?.state, "down");
  const worst = await service.check!(
    {},
    mockCtx([{ body: page({ ...ALL, "Search API": "degraded", "Fetch API": "error" }) }]).ctx,
  );
  assertEquals(worst.state, "down");
  const deg = await service.check!(
    {},
    mockCtx([{ body: page({ ...ALL, "Search API": "degraded" }) }]).ctx,
  );
  assertEquals(deg.state, "degraded");
});

Deno.test("service: the dashboard and MCP monitors never drive the verdict", async () => {
  const r = await service.check!(
    {},
    mockCtx([{ body: page({ ...ALL, "Application": "error", "MCP Server": "error" }) }]).ctx,
  );
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["application"]?.state, "degraded");
});

Deno.test("service: unknown when the page is not Linkup's, lacks the monitors, or is not JSON", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page(ALL, "Acme") }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ body: page({ "Application": "success" }) }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!(
      {},
      mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]).ctx,
    )).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 404, body: "x" }]).ctx)).state,
    "unknown",
  );
});

Deno.test("service: monitor status mapping", () => {
  assertEquals(mapMonitorStatus("success"), "ok");
  assertEquals(mapMonitorStatus("error"), "down");
  assertEquals(mapMonitorStatus("degraded"), "degraded");
  assertEquals(mapMonitorStatus("info"), "degraded");
  assertEquals(mapMonitorStatus("weird"), "unknown");
  assertEquals(mapMonitorStatus(undefined), "unknown");
});
