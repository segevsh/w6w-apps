import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import notesGet from "../../actions/notes-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("notes-get: calls GET /notes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 22984, content: "Had a lunch meeting" } }]);
  const out = await notesGet.execute({ noteId: 22984 }, ctx) as { content: string };
  assertEquals(pathOf(calls[0].url), "/notes/22984");
  assertEquals(out.content, "Had a lunch meeting");
});
