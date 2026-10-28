import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-hashtag-recent-media.ts";

Deno.test("list-hashtag-recent-media: GET /h1/recent_media with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ hashtagId: "h1", igUserId: "17", limit: 99 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/h1/recent_media");
  assertEquals(Object.fromEntries(url.searchParams), {
    user_id: "17",
    fields: "id,media_type,permalink,caption,comments_count,like_count,timestamp",
    limit: "50",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("list-hashtag-recent-media: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ hashtagId: "h1", igUserId: "17", limit: 99 }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
