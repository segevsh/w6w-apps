import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-get.ts";

Deno.test("message-get: fetches one message by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "msg_1", text: "hello" } }]);
  assertEquals(await action.execute!({ messageId: "msg_1" }, ctx), { id: "msg_1", text: "hello" });
  assertEquals(new URL(calls[0].url).pathname, "/messages/msg_1");
});

Deno.test("message-get: a missing id is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "messageId");
});
