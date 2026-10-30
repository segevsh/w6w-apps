import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-get.ts";

const note = { noteId: 400000012345, leadId: 1, content: "Called", isPin: false };

test("note-get: fetches one note by its note id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { note } }]);
  const result = await action.execute!({ noteId: 400000012345 }, ctx);
  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/notes/400000012345");
  assertEquals(result, note);
});

test("note-get: a flat body is returned unchanged", async () => {
  const { ctx } = mockCtx([{ status: 200, body: note }]);
  assertEquals(await action.execute!({ noteId: 1 }, ctx), note);
});
