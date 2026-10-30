import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import messageList from "../../actions/message-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

test("message-list: hits /messages", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "1" }]) }]);
  await messageList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages");
});
