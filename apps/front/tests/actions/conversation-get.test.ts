import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-get.ts";

Deno.test("conversation-get: fetches the conversation by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cnv_1", status: "archived" } }]);
  assertEquals(await action.execute!({ conversationId: "cnv_1" }, ctx), {
    id: "cnv_1",
    status: "archived",
  });
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1");
});

Deno.test("conversation-get: a missing id fails here, not at Front", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "conversationId");
  assertEquals(calls.length, 0);
});
