import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-add-comment.ts";

Deno.test("card-add-comment: POSTs the comment action route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1" } }]);
  await action.execute({ cardId: "c1", text: "looks good" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/actions/comments");
  assertEquals(new URL(calls[0].url).searchParams.get("text"), "looks good");
});

Deno.test("card-add-comment: is not idempotent — a retry double-posts", () => {
  assertEquals(action.idempotent, false);
});
