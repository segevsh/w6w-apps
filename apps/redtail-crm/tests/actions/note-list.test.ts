import { assertEquals } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("note-list: fetches GET /contacts/:id/notes", async () => {
  const { ctx, calls } = mockCtx([{ body: { notes: [{ id: 2, body: "She's kind of a jerk" }] } }]);
  const out = await noteList.execute({ contactId: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/notes");
  assertEquals(out.notes[0].id, 2);
});
