import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: unsigned, app-scoped, probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ status: 401, body: errorBody("API key is required", 401) }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.perspective.co/v1/workspaces");
  assertEquals(calls[0].headers["x-perspective-api-key"], undefined);
});

Deno.test("api: a schema-correct 401 is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key is required", 401) }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: HTML, 5xx and 429 map to down, down, degraded", async () => {
  const html = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await run(html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: errorBody("unavailable", 503) }]);
  assertEquals((await run(five.ctx)).state, "down");
  const limited = mockCtx([{ status: 429, body: errorBody("Rate limit exceeded", 429) }]);
  assertEquals((await run(limited.ctx)).state, "degraded");
});

Deno.test("api: a JSON body that is not Perspective's envelope is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope([]) }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("service and quota: declared absences, informational, with a reason", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(h.check, undefined);
    assertEquals(typeof h.unavailable?.reason, "string");
  }
});
