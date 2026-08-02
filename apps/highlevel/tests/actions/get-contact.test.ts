import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

Deno.test("get-contact: GETs /contacts/:contactId", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { contact: { id: "c1" } } }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/c1");
  assertEquals((out as { contact: { id: string } }).contact.id, "c1");
});
