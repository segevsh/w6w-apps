import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import notesUpdate from "../../actions/notes-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("notes-update: PUTs {content} to /notes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 22984, content: "Had another meeting" } }]);
  await notesUpdate.execute({ noteId: 22984, content: "Had another meeting" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/notes/22984");
  assertEquals(JSON.parse(calls[0].body!), { content: "Had another meeting" });
});
