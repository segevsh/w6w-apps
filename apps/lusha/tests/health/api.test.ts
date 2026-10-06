import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({} as any, ctx);

Deno.test("api: the documented JSON 401 is a pass; nothing is signed", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { statusCode: 401, error: "invalid_request" },
  }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/account/usage");
  assertEquals(calls[0].headers.api_key, undefined);
});

Deno.test("api: 5xx down, HTML 401/200 degraded, unreachable down", async () => {
  assertEquals((await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state, "down");
  assertEquals(
    (await run(mockCtx([{ status: 401, body: "<html></html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: { credits: {} } }]).ctx)).state,
    "degraded",
  );
  assertEquals((await run(mockCtx([]).ctx)).state, "down");
});
