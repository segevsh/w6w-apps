import { assertEquals } from "@std/assert";
import a from "../../actions/update-message.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("update-message: sends roomId, msgId and text to chat.update", async () => {
  const { call, json } = await run(a, { roomId: "R", messageId: "M", text: "edited" });
  assertEquals(call.method, "POST");
  assertEquals(call.url, `${BASE}/chat.update`);
  assertEquals(json, { roomId: "R", msgId: "M", text: "edited" });
});

Deno.test("update-message: custom fields are parsed from JSON", async () => {
  const { json } = await run(a, {
    roomId: "R",
    messageId: "M",
    text: "t",
    customFields: '{"priority":"high"}',
  });
  assertEquals((json as { customFields: unknown }).customFields, { priority: "high" });
});
