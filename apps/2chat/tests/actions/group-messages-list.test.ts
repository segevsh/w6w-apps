import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import groupMessagesList from "../../actions/group-messages-list.ts";

test("group-messages-list: pages group messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "page_number": 3, "messages": [] } }]);
  await groupMessagesList.execute!({ "groupUuid": "WAG1", "pageNumber": 3 } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/groups/messages/WAG1?page_number=3",
  );
  assert.deepStrictEqual(calls[0].body, null);
});
