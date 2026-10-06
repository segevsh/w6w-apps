import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-list: GETs /conversations", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      conversation_list_count: 1,
      total_conversation_count: 4,
      conversation_list: [{ conversation_id: 3 }],
    },
  }]);
  const out = await action.execute!({ filter: ["EXTERNAL"], limitCount: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/conversations");
  assertEquals(Object.fromEntries(url.searchParams), { filter: "EXTERNAL", limit_count: "1" });
  assertEquals(out, { conversations: [{ conversation_id: 3 }], count: 1, total: 4 });
});

Deno.test("conversation-list: a 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({}, ctx), { conversations: [], count: 0, total: 0 });
});
