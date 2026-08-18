import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-note-add.ts";

Deno.test("contact-note-add: posts the note against the contact", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "not_1" } }]);
  await action.execute!({ contactId: "cnt_1", body: "enterprise plan", authorId: "tea_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/cnt_1/notes");
  assertEquals(JSON.parse(calls[0].body!), { body: "enterprise plan", author_id: "tea_1" });
});

/** Front will not accept an anonymous note, unlike a comment. */
Deno.test("contact-note-add: an author is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ contactId: "cnt_1", body: "x" }, ctx),
    Error,
    "authorId",
  );
  assertEquals(calls.length, 0);
});
