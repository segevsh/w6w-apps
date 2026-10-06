import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({} as any, ctx);

Deno.test("api: the documented 400 missingAccessToken error is healthy, sent unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: { type: "missingAccessToken", message: "access token is null or empty" } },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/user");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api: 5xx is down; an HTML 200 and a typeless 400 are degraded", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(mockCtx([{ status: 400, body: { error: {} } }]).ctx)).state, "degraded");
});

Deno.test("api: an unreachable host is down", async () => {
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
