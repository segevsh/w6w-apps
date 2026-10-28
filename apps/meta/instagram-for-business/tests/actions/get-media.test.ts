import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-media.ts";

Deno.test("get-media: GET /m1 with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ mediaId: "m1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/m1");
  assertEquals(Object.fromEntries(url.searchParams), {
    fields:
      "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,is_comment_enabled",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-media: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ mediaId: "m1" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
