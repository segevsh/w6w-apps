import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-submit.ts";

Deno.test("comment-submit: posts a top-level comment with the post's t3_ fullname", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      json: { errors: [], data: { things: [{ data: { id: "c1", name: "t1_c1", body: "hi" } }] } },
    },
  }]);
  const out = await action.execute({ parentId: "t3_l0me7x", text: "hi" }, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/comment");
  assertEquals(calls[0].body, "api_type=json&thing_id=t3_l0me7x&text=hi");
  assertEquals(out, { id: "c1", name: "t1_c1", body: "hi" });
});

Deno.test("comment-submit: a t1_ parentId posts a reply to a comment", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      json: { errors: [], data: { things: [{ data: { id: "c2", name: "t1_c2", body: "re" } }] } },
    },
  }]);
  await action.execute({ parentId: "t1_c1", text: "re" }, ctx);
  assertEquals(calls[0].body, "api_type=json&thing_id=t1_c1&text=re");
});

Deno.test("comment-submit: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
