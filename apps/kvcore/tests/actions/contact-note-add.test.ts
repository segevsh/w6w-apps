import { assertEquals } from "@std/assert";
import contactNoteAdd from "../../actions/contact-note-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-note-add: PUTs to /contact/{id}/action/note without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, contact_id: 1 } }]);
  await contactNoteAdd.execute(
    { contact_id: "1", title: "Called", details: "Left a voicemail" },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/1/action/note");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { title: "Called", details: "Left a voicemail" });
  assertEquals("contact_id" in body, false);
});

Deno.test("contact-note-add: is not idempotent — each call creates a new note", () => {
  assertEquals(contactNoteAdd.idempotent, false);
});
