import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-to-mention.ts";

Deno.test("reply-to-mention: POST /17/mentions with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ igUserId: "17", mediaId: "9", commentId: "8", message: "thanks" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/17/mentions");
  assertEquals(Object.fromEntries(url.searchParams), {
    media_id: "9",
    comment_id: "8",
    message: "thanks",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("reply-to-mention: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ igUserId: "17", mediaId: "9", commentId: "8", message: "thanks" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
