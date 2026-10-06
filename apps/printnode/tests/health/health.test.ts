import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("service and quota are declared absences at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});

Deno.test("api: unsigned, app-scoped, probes /ping on the API host only", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ body: "OK" }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.printnode.com/ping");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a schema-correct auth error is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("BadRequest", "missing") }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: HTML is down even on 200; 5xx is down; odd JSON is unknown", async () => {
  const html = mockCtx([{ body: "<html>shell</html>", raw: true, headers: {} }]);
  assertEquals((await run(html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: errorBody("Unavailable", "x") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
