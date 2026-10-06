import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({} as any, ctx);

Deno.test("api: the documented 401 {message} answer is healthy, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { message: "Unauthorized access (Unauthorized).", httpStatusCode: 401 },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/self");
  assertEquals("x-appsecrettoken" in calls[0].headers, false);
  assertEquals(api.credential, "none");
});

Deno.test("api: 5xx is down; an HTML 200 and a text 404 are degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(mockCtx([{ status: 404, body: "nope" }]).ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
