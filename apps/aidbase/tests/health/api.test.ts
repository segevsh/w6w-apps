import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: declares an unsigned app-level dependency probe", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
});

Deno.test("api: probes /status unsigned and a schema-correct 401 is a PASS", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: errBody("Failed to authorize the user. The API key is missing."),
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.aidbase.ai/v1/status");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: an HTML 200 is down, a 5xx JSON is down, an unrecognised JSON is unknown", async () => {
  const html = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  assertEquals((await run(html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: errBody("unavailable") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});

Deno.test("service and quota: declared absences at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.check, undefined);
  }
  assertEquals(service.kind, "service");
  assertEquals(quota.kind, "quota");
});
