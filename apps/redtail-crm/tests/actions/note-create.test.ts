import { assert, assertEquals } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("note-create: POSTs /contacts/:id/notes with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { note: { id: 6, body: "Test", category_id: 2 } },
  }]);
  const out = await noteCreate.execute({ contactId: 1, body: "Test", categoryId: 2 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/notes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { body: "Test", category_id: 2 });
  assert(!("notify_user_id" in body));
  assertEquals(out.note.id, 6);
});

Deno.test("note-create: is not idempotent — a retry logs a second note", () => {
  assertEquals(noteCreate.idempotent, false);
});
