import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-tag-add.ts";

Deno.test("conversation-tag-add: POSTs the ids, adding rather than replacing", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(
    await action.execute!({ conversationId: "cnv_1", tagIds: "tag_1, tag_2" }, ctx),
    { ok: true, tagIds: ["tag_1", "tag_2"] },
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/tags");
  assertEquals(JSON.parse(calls[0].body!), { tag_ids: ["tag_1", "tag_2"] });
});

/** Adding an existing tag is a no-op at Front, so retries are safe. */
Deno.test("conversation-tag-add: declares itself idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("conversation-tag-add: an empty tag list is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1", tagIds: "" }, ctx),
    Error,
    "tagIds",
  );
  assertEquals(calls.length, 0);
});
