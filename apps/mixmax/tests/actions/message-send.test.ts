import { assertEquals } from "@std/assert";
import action from "../../actions/message-send.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-send: POST /messages/m1/send", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await action.execute!({ messageId: "m1", data: '{"subject":"New"}' } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/messages/m1/send");
  assertEquals(JSON.parse(calls[0].body!), { data: { subject: "New" } });
  assertEquals(out, { sent: true, result: {} });
});
