import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-message-list.ts";

Deno.test("conversation-message-list: reads messages, and pages when asked", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        _results: [{ id: "msg_1" }],
        _pagination: { next: "https://acme.api.frontapp.com/x?page_token=t2" },
      },
    },
    { status: 200, body: { _results: [{ id: "msg_2" }], _pagination: { next: null } } },
  ]);
  const out = await action.execute!({ conversationId: "cnv_1", returnAll: true }, ctx);
  assertEquals(out, [{ id: "msg_1" }, { id: "msg_2" }]);
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/messages");
});

/** Messages and comments are separate collections — this reads only one. */
Deno.test("conversation-message-list: the limit bounds the result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { _results: [{ id: "a" }, { id: "b" }] } }]);
  assertEquals(await action.execute!({ conversationId: "cnv_1", limit: 1 }, ctx), [{ id: "a" }]);
});
