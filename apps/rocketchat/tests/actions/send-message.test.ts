import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/send-message.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("send-message: wraps the message in the { message: { rid, msg } } envelope", async () => {
  const { call, json } = await run(a, {
    roomId: "R1",
    text: "hello",
    threadMessageId: "m",
    alsoSendToChannel: true,
  });
  assertEquals(call.method, "POST");
  assertEquals(call.url, `${BASE}/chat.sendMessage`);
  assertEquals(json, { message: { rid: "R1", msg: "hello", tmid: "m", tshow: true } });
});

Deno.test("send-message: blocks and attachments pass through; empty is refused", async () => {
  const blocks = [{ type: "section" }];
  const { json } = await run(a, { roomId: "R1", blocks });
  assertEquals(json, { message: { rid: "R1", blocks } });
  assertThrows(
    () => a.execute({ roomId: "R1" }, mockCtx().ctx),
    Error,
    "text, attachments or blocks",
  );
});
