import { assertEquals } from "@std/assert";
import contactNoteCreate from "../../actions/contact-note-create.ts";
import { bodyOf, doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-note-create: POSTs the note with its contact relationship", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: doc("3", "contact_notes") }]);
  await contactNoteCreate.execute({ contactId: "9", body: "Refunded via Stripe" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/contact_notes");

  const body = bodyOf(calls[0]) as {
    data: {
      type: string;
      attributes: { body: string };
      relationships: { contact: { data: { id: string; type: string } } };
    };
  };
  assertEquals(body.data.type, "contact_notes");
  assertEquals(body.data.attributes.body, "Refunded via Stripe");
  // The required relationship here is the contact, not the site.
  assertEquals(body.data.relationships.contact.data, { id: "9", type: "contacts" });
});

/** No natural key on a note, so a retry duplicates rather than converging. */
Deno.test("contact-note-create: is not idempotent", () => {
  assertEquals(contactNoteCreate.idempotent, false);
});
