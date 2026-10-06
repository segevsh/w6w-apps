import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/post-message.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("post-message: POSTs roomId + text to chat.postMessage", async () => {
  const { call, json } = await run(a, { room: "#general", text: "hi" }, { channel: "general" });
  assertEquals(call.method, "POST");
  assertEquals(call.url, `${BASE}/chat.postMessage`);
  assertEquals(json, { roomId: "#general", text: "hi" });
});

Deno.test("post-message: thread reply, alias, attachments (value or JSON string) are mapped", async () => {
  const att = [{ title: "T", text: "x" }];
  const r1 = await run(a, {
    room: "r1",
    threadMessageId: "m1",
    alias: "Bot",
    parseUrls: false,
    attachments: att,
  });
  assertEquals(r1.json, {
    roomId: "r1",
    tmid: "m1",
    alias: "Bot",
    parseUrls: false,
    attachments: att,
  });
  const r2 = await run(a, { room: "r1", attachments: JSON.stringify(att) });
  assertEquals((r2.json as { attachments: unknown }).attachments, att);
});

Deno.test("post-message: refuses an empty message and bad attachment JSON before any call", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => a.execute({ room: "r" }, ctx), Error, "text or attachments");
  assertThrows(() => a.execute({ room: "r", attachments: "{" }, ctx), Error, "valid JSON");
  assertEquals(calls.length, 0);
});
