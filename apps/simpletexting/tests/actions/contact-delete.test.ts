import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs the contact's path and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await contactDelete.execute({ contactIdOrNumber: "1234567890" }, ctx) as {
    contactIdOrNumber: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/api/contacts/1234567890`);
  assertEquals(result.contactIdOrNumber, "1234567890");
  assertEquals(result.status, 204);
});

Deno.test("contact-delete: escapes a hexadecimal id the same way as a phone number", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await contactDelete.execute({ contactIdOrNumber: "507f1f77bcf86cd799439011" }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/api/contacts/507f1f77bcf86cd799439011`);
});

Deno.test("contact-delete: declared idempotent — deleting twice ends in the same state", () => {
  assertEquals(contactDelete.idempotent, true);
  assertEquals(contactDelete.type, "perform");
});
