import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const LIVE_401 = { error: "Unauthorized", status: 401, message: "Invalid token undefined" };

Deno.test("api: the documented JSON 401 is ok and the probe is an unsigned POST /api/v3/query", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: LIVE_401 }]);
  const r = await check.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/query");
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("api: a bodiless or foreign 401 is degraded, not ok", async () => {
  const empty = mockCtx([{ status: 401 }]);
  assertEquals((await check.check!({} as never, empty.ctx)).state, "degraded");
  const html = mockCtx([{ status: 401, body: "<html>proxy</html>" }]);
  assertEquals((await check.check!({} as never, html.ctx)).state, "degraded");
});

Deno.test("api: 5xx and an unreachable host are down; an unexpected 200 is degraded", async () => {
  const five = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await check.check!({} as never, five.ctx)).state, "down");
  assertEquals((await check.check!({} as never, mockCtx().ctx)).state, "down");
  const ok = mockCtx([{ status: 200, body: {} }]);
  assertEquals((await check.check!({} as never, ok.ctx)).state, "degraded");
  const nf = mockCtx([{ status: 404, body: { message: "nope" } }]);
  assertEquals((await check.check!({} as never, nf.ctx)).state, "degraded");
});
