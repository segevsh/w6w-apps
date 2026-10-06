import { assertEquals } from "@std/assert";
import createNote from "../../actions/create-note.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-note: POST /notes with contact, text, linked deal and notify list", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ note: { id: "n1" } }) }]);
  const out = await createNote.execute({
    contactId: "c1",
    text: "Met at the conference",
    linkedDealId: "d1",
    userIdsToNotify: "u1, u2",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/notes");
  assertEquals(bodyOf(calls[0]), {
    contact_id: "c1",
    text: "Met at the conference",
    linked_deal_id: "d1",
    user_ids_to_notify: ["u1", "u2"],
  });
  assertEquals(out.note, { id: "n1" });
  assertEquals(createNote.idempotent, false);
});
