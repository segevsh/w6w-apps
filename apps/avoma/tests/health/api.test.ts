import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { detail, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: detail("Auth missing in header and cookie"),
  }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.avoma.com/v1/users/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a schema-correct 401 detail body is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detail("Auth missing in header and cookie") }]);
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
  const five = mockCtx([{ status: 503, body: { detail: "unavailable" } }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
