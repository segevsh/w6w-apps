import { assertEquals } from "@std/assert";
import contactAddressUpdate from "../../actions/contact-address-update.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("contact-address-update: PUTs /contacts/:id/addresses/:id and reports 204 as success", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await contactAddressUpdate.execute(
    { contactId: 1, addressId: 19, isPreferred: true },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/addresses/19");
  assertEquals(JSON.parse(calls[0].body!), { is_preferred: true });
  assertEquals(out, { updated: true });
});
