import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ status: 400, body: errorBody(400, "Missing header") }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://axonaut.com/api/v2/languages");
  assertEquals(calls[0].headers["userapikey"], undefined);
});

Deno.test("api: a schema-correct 400 or 403 error body is a PASS, not an outage", async () => {
  for (const status of [400, 403]) {
    const { ctx } = mockCtx([{ status, body: errorBody(status, "x") }]);
    assertEquals((await run(ctx)).state, "ok");
  }
});

Deno.test("api: an HTML page is down, even on a 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>", headers: {} }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: a 5xx JSON body is down, an unrecognised JSON body is unknown", async () => {
  const five = mockCtx([{ status: 503, body: errorBody(503, "unavailable") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
