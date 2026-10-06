import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (api: string, mcp = "operational", name = "Tavily") => ({
  page: { id: "p", name },
  components: [
    { id: "a", name: "Tavily API Service", status: api },
    { id: "m", name: "Tavily MCP", status: mcp },
    { id: "w", name: "Tavily Website", status: "operational" },
  ],
});

Deno.test("service: reads the Tavily status page", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).length, 3);
});

Deno.test("service: only the API component decides, MCP is capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: summary("operational", "major_outage") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components!["m"].state, "degraded");
});

Deno.test("service: API outage is down; partial outage is degraded", async () => {
  const down = await service.check!({} as never, mockCtx([{ body: summary("major_outage") }]).ctx);
  assertEquals(down.state, "down");
  const part = await service.check!(
    {} as never,
    mockCtx([{ body: summary("partial_outage") }]).ctx,
  );
  assertEquals(part.state, "degraded");
});

Deno.test("service: a foreign page, bad status or missing component is unknown, never down", async () => {
  const foreign = await service.check!(
    {} as never,
    mockCtx([{ body: summary("major_outage", "operational", "Other") }]).ctx,
  );
  assertEquals(foreign.state, "unknown");
  const http = await service.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx);
  assertEquals(http.state, "unknown");
  const none = await service.check!(
    {} as never,
    mockCtx([{ body: { page: { name: "Tavily" }, components: [] } }]).ctx,
  );
  assertEquals(none.state, "unknown");
});

Deno.test("service: declares the unsigned posture and the status host in its own allowlist", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network, { allow: ["status.tavily.com"] });
  assertEquals(mapComponentStatus("weird"), "unknown");
});
