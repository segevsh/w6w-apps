import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import postUpdate from "../../actions/post-update.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("post-update: posts postID and the changed fields, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: "success" }]);
  const out = await postUpdate.execute({ postID: "p1", title: "New title" }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/update");
  assertEquals(bodyOf(calls[0]), { postID: "p1", title: "New title" });
  assertEquals(out.message, "success");
});

test("post-update: is idempotent", () => {
  assertEquals(postUpdate.idempotent, true);
});
