import { assertEquals } from "@std/assert";
import action from "../../actions/message-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-get: GET /messages/m%201", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "m 1", subject: "Hi" } }]);
  const out = await action.execute!({ messageId: "m 1" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/messages/m%201");
  assertEquals(calls[0].body, null);
  assertEquals(out, { message: { _id: "m 1", subject: "Hi" } });
});
