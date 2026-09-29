import { assertEquals } from "@std/assert";
import noteDelete from "../../actions/note-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("note-delete: DELETEs /contacts/:id/notes/:id", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await noteDelete.execute({ contactId: 1, noteId: 6 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/notes/6");
  assertEquals(out, { deleted: true });
});
