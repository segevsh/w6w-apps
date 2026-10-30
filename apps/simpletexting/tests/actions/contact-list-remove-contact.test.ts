import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactListRemoveContact from "../../actions/contact-list-remove-contact.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("contact-list-remove-contact: DELETEs the membership path and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await contactListRemoveContact.execute(
    { listIdOrName: "My First List", contactPhoneOrId: "1234567890" },
    ctx,
  ) as { listIdOrName: string; contactPhoneOrId: string; status: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    `${API_ROOT}/api/contact-lists/My%20First%20List/contacts/1234567890`,
  );
  assertEquals(result.status, 204);
});

test("contact-list-remove-contact: declared idempotent — the membership stays gone on a retry", () => {
  assertEquals(contactListRemoveContact.idempotent, true);
});
