import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { GATEWAY_401, mockCtx } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{ status: 401, body: GATEWAY_401 }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.alegra.com/api/v1/company");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: the gateway's schema-correct 401 is a PASS, not an outage", async () => {
  assertEquals((await run(mockCtx([{ status: 401, body: GATEWAY_401 }]).ctx)).state, "ok");
});

Deno.test("api: an application {error, code} body also proves the API is serving", async () => {
  const r = await run(mockCtx([{ status: 404, body: { error: "x", code: 404 } }]).ctx);
  assertEquals(r.state, "ok");
});

Deno.test("api: an HTML page is down; a 5xx JSON body is down; an unknown JSON shape is unknown", async () => {
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html>shell</html>" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await run(mockCtx([{ status: 503, body: { message: "unavailable" } }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: { hello: "world" } }]).ctx)).state,
    "unknown",
  );
});
