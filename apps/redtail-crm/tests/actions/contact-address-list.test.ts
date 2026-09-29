import { assertEquals } from "@std/assert";
import contactAddressList from "../../actions/contact-address-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-address-list: fetches GET /contacts/:id/addresses", async () => {
  const { ctx, calls } = mockCtx([{ body: { addresses: [{ id: 3, city: "Sacramento" }] } }]);
  const out = await contactAddressList.execute({ contactId: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1/addresses");
  assertEquals(out.addresses[0].city, "Sacramento");
});
