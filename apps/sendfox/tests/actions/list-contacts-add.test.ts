import { assertEquals } from "@std/assert";
import listContactsAdd from "../../actions/list-contacts-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-contacts-add: POSTs contact_id to /lists/{list_id}/contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, email: "a@b.c" } }]);
  const out = await listContactsAdd.execute({ listId: 1, contactId: 3 }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lists/1/contacts");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { contact_id: 3 });
  assertEquals(out.id, 3);
});

/** "If the contact is already in the list, no duplicate is created." */
Deno.test("list-contacts-add: is marked idempotent", () => {
  assertEquals(listContactsAdd.idempotent, true);
});
