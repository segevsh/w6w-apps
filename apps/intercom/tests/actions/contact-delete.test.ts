import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", deleted: true } }]);
  const result = await action.execute!({ contactId: "abc" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/contacts/abc");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: "abc", deleted: true });
});
