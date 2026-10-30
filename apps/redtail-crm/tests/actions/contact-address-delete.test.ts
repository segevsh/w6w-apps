import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactAddressDelete from "../../actions/contact-address-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

test("contact-address-delete: DELETEs /contacts/:id/addresses/:id", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await contactAddressDelete.execute({ contactId: 1, addressId: 19 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/addresses/19");
  assertEquals(out, { deleted: true });
});
