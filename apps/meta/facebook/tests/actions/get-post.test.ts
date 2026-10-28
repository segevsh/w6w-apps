import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-post.ts";

Deno.test("get-post: GETs /{postId} with default fields", async () => {
  const body = { id: "post-1", message: "hi" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ postId: "post-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/post-1");
  assertEquals(
    url.searchParams.get("fields"),
    "id,message,created_time,permalink_url,from,full_picture",
  );
  assertEquals(result, body);
});

Deno.test("get-post: honours a custom fields override", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "post-1" } }]);
  await action.execute!({ postId: "post-1", fields: "id,message" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "id,message");
});
