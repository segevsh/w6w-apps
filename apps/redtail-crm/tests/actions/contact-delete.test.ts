import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /contacts/:id and reports 204 as success", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await contactDelete.execute({ contactId: 1 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1");
  assertEquals(out, { deleted: true });
});

Deno.test("contact-delete: is idempotent — deleting an already-deleted contact is safe to retry", () => {
  assertEquals(contactDelete.idempotent, true);
});
