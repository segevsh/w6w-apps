import { assertEquals } from "@std/assert";
import contactAddressCreate from "../../actions/contact-address-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-address-create: POSTs /contacts/:id/addresses", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true, id: 19 } }]);
  const out = await contactAddressCreate.execute({
    contactId: 1,
    streetAddress: "3131 Fite Cir.",
    city: "Sacramento",
    state: "CA",
    zip: "95827",
    addressType: 1,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/addresses");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.street_address, "3131 Fite Cir.");
  assertEquals(body.address_type, 1);
  assertEquals(out, { success: true, id: 19 });
});
