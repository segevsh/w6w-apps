import { assertEquals } from "@std/assert";
import contactNoteUpdate from "../../actions/contact-note-update.ts";
import { bodyOf, doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-note-update: PATCHes the note body", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("3", "contact_notes") }]);
  await contactNoteUpdate.execute({ id: "3", body: "Corrected" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0]), "/v1/contact_notes/3");

  const body = bodyOf(calls[0]) as {
    data: { id: string; type: string; attributes: { body: string } };
  };
  assertEquals(body.data.id, "3");
  assertEquals(body.data.type, "contact_notes");
  assertEquals(body.data.attributes.body, "Corrected");
});

/** The update schema declares no `relationships` — a note cannot be re-homed. */
Deno.test("contact-note-update: cannot move a note to another contact", () => {
  const keys = contactNoteUpdate.params!.map((p) => p.key);
  assertEquals(keys.includes("contactId"), false);
});
