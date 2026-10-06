import { assertEquals, assertRejects } from "@std/assert";
import deleteContact from "../../actions/delete-contact.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("delete-contact: DELETE /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await deleteContact.execute({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/c1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { deleted: true, restored: false });
});

Deno.test("delete-contact: undo=true restores instead", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await deleteContact.execute({ contactId: "c1", undo: true }, ctx);
  assertEquals(queryOf(calls[0].url), { undo: "true" });
  assertEquals(out, { deleted: false, restored: true });
});

Deno.test("delete-contact: a permission 403 (JSON envelope) is an error, not a throttle", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("no_permission_to_complete_action", "no permission", 403),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(deleteContact.execute({ contactId: "c1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("throttled"), false);
  assertEquals(err.message.includes("no_permission_to_complete_action"), true);
});
