import { assertEquals } from "@std/assert";
import action from "../../actions/message-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-create: POST /messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "m9" } }]);
  const out = await action.execute!(
    { to: "a@x.com, b@x.com", subject: "S", trackingEnabled: false } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    to: [{ email: "a@x.com" }, { email: "b@x.com" }],
    subject: "S",
    trackingEnabled: false,
  });
  assertEquals(out, { message: { _id: "m9" }, messageId: "m9" });
});
