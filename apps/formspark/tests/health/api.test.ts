import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx, problem, PROBLEM_HEADERS } from "../_helpers.ts";

const run = (ctx: ReturnType<typeof mockCtx>["ctx"]) => api.check!({} as never, ctx);

Deno.test("api: is unsigned, app-scoped, and probes only the API host", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
  assertEquals(api.network, undefined);
  const { ctx, calls } = mockCtx([{
    status: 401,
    headers: PROBLEM_HEADERS,
    body: problem(401, "invalid_token", "Provide a token in the Authorization header."),
  }]);
  await run(ctx);
  assertEquals(calls[0].url, "https://api.formspark.io/public/v1/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: a schema-correct 401 problem body is a PASS, not an outage", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: PROBLEM_HEADERS,
    body: problem(401, "invalid_token", "Provide a token in the Authorization header."),
  }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("api: an HTML error page is down, even on a 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("api: a 5xx is down, an unrecognised JSON body is unknown", async () => {
  const five = mockCtx([{ status: 503, body: problem(503, "upstream_unavailable", "x") }]);
  assertEquals((await run(five.ctx)).state, "down");
  const odd = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(odd.ctx)).state, "unknown");
});
