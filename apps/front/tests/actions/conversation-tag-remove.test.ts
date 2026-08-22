import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-tag-remove.ts";

/** Front takes the ids in a body on a DELETE — unusual, and load-bearing. */
Deno.test("conversation-tag-remove: the DELETE carries a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", tagIds: "tag_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assert(calls[0].body, "a DELETE with no body would silently change nothing");
  assertEquals(JSON.parse(calls[0].body!), { tag_ids: ["tag_1"] });
});

Deno.test("conversation-tag-remove: an empty tag list is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1" }, ctx),
    Error,
    "tagIds",
  );
  assertEquals(calls.length, 0);
});
