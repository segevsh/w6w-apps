import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/add-tag-to-contact.ts";

Deno.test("add-tag-to-contact: POSTs /contacts/:contactId/tags with the parsed tag list", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { tags: ["vip", "lead"] } }]);
  const out = await action.execute!({ contactId: "c1", tags: "vip, lead" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/c1/tags");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["vip", "lead"] });
  assertEquals((out as { tags: string[] }).tags, ["vip", "lead"]);
});
