import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx, slError } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: slError("auth/unauthorized", "Invalid apiKey"),
  }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.slite.com/v1/me");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-slite-api-key"], undefined);
});

Deno.test("api: a schema-correct 401 id+message body is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: slError("auth/unauthorized", "Invalid apiKey") }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: a 200 profile body is a pass too", async () => {
  const { ctx } = mockCtx([{ body: { email: "a@b.c" } }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: an HTML error page is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: a 5xx JSON body is down, an unrecognised JSON body is unknown", async () => {
  const five = mockCtx([{ status: 503, body: slError("x", "unavailable") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
