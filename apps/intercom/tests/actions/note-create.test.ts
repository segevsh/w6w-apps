import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs /contacts/{id}/notes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1", type: "note" } }]);
  await action.execute!({ contactId: "abc", body: "Called them", adminId: "99" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/contacts/abc/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "Called them", admin_id: "99" });
});

Deno.test("note-create: omits admin_id when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await action.execute!({ contactId: "abc", body: "note" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body: "note" });
});
