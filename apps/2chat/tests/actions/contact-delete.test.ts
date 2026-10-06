import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import contactDelete from "../../actions/contact-delete.ts";

Deno.test("contact-delete: deletes by uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await contactDelete.execute!({ "contactUuid": "CON9" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/contacts/CON9");
  assertEquals(calls[0].body, null);
});
