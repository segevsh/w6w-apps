import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import quota from "../../health/quota.ts";
import { detailBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: detailBody("Authentication credentials were not provided."),
  }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.landbot.io/v1/channels/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a schema-correct 401 `detail` body is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detailBody("Invalid token.") }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: an HTML 200 is down, a 5xx JSON is down, an unrecognised JSON is unknown", async () => {
  const html = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  assertEquals((await run(html.ctx)).state, "down");
  const five = mockCtx([{ status: 503, body: detailBody("unavailable") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});

Deno.test("quota: a declared absence at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.unavailable?.reason, "string");
  assertEquals(quota.check, undefined);
});
