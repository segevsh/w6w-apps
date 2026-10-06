import { assertEquals, assertRejects } from "@std/assert";
import a from "../../actions/set-channel-topic.ts";
import { BASE, mockCtx, rcError, run } from "../_helpers.ts";

Deno.test("set-channel-topic: POSTs roomId and topic to channels.setTopic", async () => {
  const { call, json, result } = await run(a, { roomId: "C", topic: "Hello" }, { topic: "Hello" });
  assertEquals(call.url, `${BASE}/channels.setTopic`);
  assertEquals(json, { roomId: "C", topic: "Hello" });
  assertEquals((result as { topic: string }).topic, "Hello");
});

Deno.test("set-channel-topic: a vendor refusal is thrown with its text", async () => {
  const { ctx } = mockCtx([rcError("[error-not-allowed]", 403)]);
  await assertRejects(async () => await a.execute({ roomId: "C", topic: "x" }, ctx), Error, "403");
});
