import { assertEquals, assertRejects } from "@std/assert";
import watchTimeGet from "../../actions/watch-time-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("watch-time-get: sends GET /analytics/videos/views/total_watch_time", async () => {
  const { ctx, calls } = mockCtx([{ body: { "total_watch_time": 1234 } }]);
  const out = await watchTimeGet.execute({ "userId": "a@b.co" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/analytics/videos/views/total_watch_time");
  assertEquals(queryOf(calls[0].url), { "user_id": "a@b.co" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "total_watch_time": 1234 });
});

Deno.test("watch-time-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () => watchTimeGet.execute({ "userId": "a@b.co" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
