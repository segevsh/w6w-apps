import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /contacts/{id} and returns the message", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Contact deleted" } }]);
  const out = await contactDelete.execute({ id: 11 }, ctx) as { message: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/contacts/11");
  assertEquals(calls[0].body, null);
  assertEquals(out.message, "Contact deleted");
});

Deno.test("contact-delete: is safe to retry", () => {
  assertEquals(contactDelete.idempotent, true);
});
