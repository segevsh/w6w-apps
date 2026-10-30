import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import candidateNoteCreate from "../../actions/candidate-note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("candidate-note-create: POSTs a note nested under `note.body`", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { note: { id: 1 }, references: [] } }]);
  await candidateNoteCreate.execute({ candidateId: 12, body: "Great candidate" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates/12/notes");
  assertEquals(JSON.parse(calls[0].body!), { note: { body: "Great candidate" } });
});
