import { assertEquals } from "@std/assert";
import contactListAddContact from "../../actions/contact-list-add-contact.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("contact-list-add-contact: POSTs the contact onto the list's membership path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await contactListAddContact.execute(
    { listIdOrName: "My First List", contactPhoneOrId: "1234567890" },
    ctx,
  ) as { listIdOrName: string; contactPhoneOrId: string; status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/My%20First%20List/contacts`);
  assertEquals(bodyOf(calls[0]), { contactPhoneOrId: "1234567890" });
  assertEquals(result.status, 200);
});

Deno.test("contact-list-add-contact: is not idempotent — duplicate membership is unverified", () => {
  assertEquals(contactListAddContact.idempotent, false);
});

Deno.test("contact-list-add-contact: both the list and the contact are required", () => {
  const listParam = contactListAddContact.params!.find((p) => p.key === "listIdOrName");
  const contactParam = contactListAddContact.params!.find((p) => p.key === "contactPhoneOrId");
  assertEquals(listParam?.required, true);
  assertEquals(contactParam?.required, true);
});
