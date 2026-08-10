import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { doc, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs the contact", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("5") }]);
  await contactDelete.execute({ id: "5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/v1/contacts/5");
  assertEquals(calls[0].body, null);
});

/** Deleting an already-deleted contact converges — safe for the runtime to retry. */
Deno.test("contact-delete: is idempotent", () => {
  assertEquals(contactDelete.idempotent, true);
});
