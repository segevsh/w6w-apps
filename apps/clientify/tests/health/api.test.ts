import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import api from "../../health/api.ts";
import { detail, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

test("api: unsigned, app-scoped, probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ status: 404, body: detail("Api key not provided.") }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.clientify.net/v1/users/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("api: the documented JSON auth refusal (404 or 401) is a PASS", async () => {
  for (const [status, msg] of [[404, "Api key not provided."], [401, "Invalid token."]] as const) {
    const { ctx } = mockCtx([{ status, body: detail(msg) }]);
    assertEquals((await run(ctx)).state, "ok");
  }
});

test("api: a list envelope is a pass, an HTML body is down", async () => {
  assertEquals((await run(mockCtx([{ status: 200, body: [] }]).ctx)).state, "ok");
  const html = mockCtx([{
    status: 404,
    body: "<html></html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(html.ctx)).state, "down");
});

test("api: 5xx JSON is down, an unrecognised JSON body is unknown", async () => {
  assertEquals((await run(mockCtx([{ status: 503, body: detail("x") }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: { hello: "world" } }]).ctx)).state,
    "unknown",
  );
});
