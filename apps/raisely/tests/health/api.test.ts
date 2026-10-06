import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  const { ctx, calls } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "You are not authorized to do that"),
  }]);
  await run(ctx);
  assertEquals(pathOf(calls[0].url), "/v3/campaigns");
  assertEquals(new URL(calls[0].url).host, "api.raisely.com");
  assertEquals(queryOf(calls[0].url), { private: "true", limit: "1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a schema-correct 403 or 401 body is a PASS, not an outage", async () => {
  for (
    const [status, code] of [[403, "forbidden"], [401, "unauthorized"]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: errorBody(code, "refused") }]);
    assertEquals((await run(ctx)).state, "ok");
  }
});

Deno.test("api: a 200 data envelope is also a pass", async () => {
  assertEquals((await run(mockCtx([{ body: listEnvelope([]) }]).ctx)).state, "ok");
});

Deno.test("api: a 5xx is down; an HTML shell is down; a foreign JSON body is unknown", async () => {
  assertEquals((await run(mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  assertEquals((await run(mockCtx([{ body: "<html>shell</html>" }]).ctx)).state, "down");
  assertEquals((await run(mockCtx([{ body: { hello: "world" } }]).ctx)).state, "unknown");
});
