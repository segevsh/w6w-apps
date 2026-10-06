import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import api from "../../health/api.ts";
import { errorEnvelope, mockCtx, okEnvelope } from "../_helpers.ts";

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

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ status: 401, body: errorEnvelope(1000, "x") }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.vbout.com/1/app/me.json");
});

Deno.test("api: a schema-correct auth error is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(1000, "x") }]);
  assertEquals((await run(ctx)).state, "ok");
  const okBody = mockCtx([{ body: okEnvelope({ business: {} }) }]);
  assertEquals((await run(okBody.ctx)).state, "ok");
});

Deno.test("api: an HTML page is down, even on a 200", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>", headers: {} }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: a 5xx is down, an unrecognised JSON body is unknown", async () => {
  const five = mockCtx([{ status: 503, body: errorEnvelope(1, "unavailable") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
