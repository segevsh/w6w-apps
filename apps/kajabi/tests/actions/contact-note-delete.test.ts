import { assertEquals } from "@std/assert";
import contactNoteDelete from "../../actions/contact-note-delete.ts";
import { doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-note-delete: DELETEs the note", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("3", "contact_notes") }]);
  await contactNoteDelete.execute({ id: "3" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/v1/contact_notes/3");
});

Deno.test("contact-note-delete: is idempotent", () => {
  assertEquals(contactNoteDelete.idempotent, true);
});
