import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

Deno.test("delete-contact: DELETEs /contacts/:contactId and confirms", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ status: 200, body: {} }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/c1");
  assertEquals(out, { id: "c1", deleted: true });
});
