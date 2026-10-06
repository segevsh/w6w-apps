import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: errorBody(
      400,
      "key-missing",
      "X-FareHarbor-API-App header or api-app parameter is required",
    ),
  }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://fareharbor.com/api/external/v1/companies/");
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("api: a schema-correct key-missing envelope is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(400, "key-missing", "keys required") }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: an HTML page is down, even at 200", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: a 5xx JSON body is down, an unrecognised JSON body is unknown", async () => {
  const five = mockCtx([{ status: 503, body: { error: "x" } }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
