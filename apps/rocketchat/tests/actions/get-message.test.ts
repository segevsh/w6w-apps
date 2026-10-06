import { assertEquals, assertRejects } from "@std/assert";
import a from "../../actions/get-message.ts";
import { BASE, mockCtx, rcError, run } from "../_helpers.ts";

Deno.test("get-message: GET chat.getMessage?msgId=", async () => {
  const { call, query, result } = await run(a, { messageId: "M1" }, { message: { _id: "M1" } });
  assertEquals(call.method, "GET");
  assertEquals(call.url.split("?")[0], `${BASE}/chat.getMessage`);
  assertEquals(query.get("msgId"), "M1");
  assertEquals((result as { message: { _id: string } }).message._id, "M1");
});

Deno.test("get-message: an unknown id surfaces the vendor error", async () => {
  const { ctx } = mockCtx([rcError("[error-message-not-found]")]);
  await assertRejects(
    async () => await a.execute({ messageId: "x" }, ctx),
    Error,
    "error-message-not-found",
  );
});
