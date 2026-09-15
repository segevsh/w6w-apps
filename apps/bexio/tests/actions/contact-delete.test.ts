import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /2.0/contact/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute!({ contactId: 4 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/contact/4");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
