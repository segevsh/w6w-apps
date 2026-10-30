import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({} as any, ctx);

test("api: the 401 errors envelope passes, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current");
  assertEquals(calls[0].headers.authorization, undefined);
});

test("api: 5xx is down; an HTML 200 shell is degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals((await run(mockCtx([{ body: "<html></html>" }]).ctx)).state, "degraded");
});

test("api: a network failure is down", async () => {
  // deno-lint-ignore no-explicit-any
  const boom = { fetch: () => Promise.reject(new Error("dns")) } as any;
  assertEquals((await run(boom)).state, "down");
});
