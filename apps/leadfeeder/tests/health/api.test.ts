import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";

const run = (ctx: HookContext) => api.check!({} as never, ctx);

Deno.test("api: a schema-correct 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { errors: [{ code: "missing_token", title: "x" }], meta: {} },
  }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api: 5xx is down, a foreign body is degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad" }]).ctx)).state, "down");
  assertEquals((await run(mockCtx([{ status: 200, body: "<html>" }]).ctx)).state, "degraded");
});
