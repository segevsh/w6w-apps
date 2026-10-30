import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import a from "../../actions/delete-message.ts";
import { BASE, run } from "../_helpers.ts";

test("delete-message: sends roomId and msgId to chat.delete", async () => {
  const { call, json } = await run(a, { roomId: "R", messageId: "M" }, { _id: "M" });
  assertEquals(call.url, `${BASE}/chat.delete`);
  assertEquals(json, { roomId: "R", msgId: "M" });
});

test("delete-message: asUser:false is sent (not dropped as empty)", async () => {
  const { json } = await run(a, { roomId: "R", messageId: "M", asUser: false });
  assertEquals(json, { roomId: "R", msgId: "M", asUser: false });
});
