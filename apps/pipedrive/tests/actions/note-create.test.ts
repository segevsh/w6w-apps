import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs /notes with content and a link id", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!({ content: "Follow up", dealId: 7 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { content: "Follow up", deal_id: 7 });
});
