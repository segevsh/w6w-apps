import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactsDelete from "../../actions/contacts-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contacts-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await contactsDelete.execute({ contactId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/1");
});

test("contacts-delete: declared idempotent", () => {
  assertEquals(contactsDelete.idempotent, true);
});
