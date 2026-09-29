import { assert, assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-create: POSTs /contacts with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true, id: 74 } }]);
  const out = await contactCreate.execute({
    type: "Crm::Contact::Individual",
    firstName: "Margaret",
    lastName: "Investor",
    taxId: "229065340",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "Crm::Contact::Individual");
  assertEquals(body.first_name, "Margaret");
  assert(!("middle_name" in body), "unset fields must not be sent");
  assertEquals(out, { success: true, id: 74 });
});

Deno.test("contact-create: is not idempotent — a retry creates a second contact", () => {
  assertEquals(contactCreate.idempotent, false);
});
