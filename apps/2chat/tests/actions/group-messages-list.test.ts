import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import groupMessagesList from "../../actions/group-messages-list.ts";

Deno.test("group-messages-list: pages group messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "page_number": 3, "messages": [] } }]);
  await groupMessagesList.execute!({ "groupUuid": "WAG1", "pageNumber": 3 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/groups/messages/WAG1?page_number=3",
  );
  assertEquals(calls[0].body, null);
});
