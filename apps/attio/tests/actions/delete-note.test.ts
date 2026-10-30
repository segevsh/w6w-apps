import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, run } from "../_helpers.ts";
import deleteNote from "../../actions/delete-note.ts";

test("delete-note: DELETEs and notes there is no update endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await run<{ deleted: boolean; note_id: string }>(deleteNote, { noteId: "n1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.attio.com/v2/notes/n1");
  assertEquals(out, { deleted: true, note_id: "n1" });
  assert(/no update endpoint/i.test(deleteNote.description!));
});
