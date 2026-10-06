import { assertEquals } from "@std/assert";
import api from "../health/api.ts";
import { errorBody, mockCtx, pathOf } from "./_helpers.ts";

const run = (ctx: never) => api.check!({} as never, ctx);

Deno.test("health api: a schema-correct unsigned 403 is a pass (reachability proven)", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: errorBody("forbidden", "Invalid") }]);
  const r = await run(ctx as never);
  assertEquals(r.state, "ok");
  assertEquals(pathOf(calls[0].url), "/api/templates");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("health api: 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { status: "error" } }]);
  assertEquals((await run(ctx as never)).state, "down");
});

Deno.test("health api: an HTML shell answering 200 is down, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html></html>" }]);
  assertEquals((await run(ctx as never)).state, "down");
});

Deno.test("health api: JSON that is not the vendor envelope is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(ctx as never)).state, "unknown");
});
