import { assertEquals } from "@std/assert";
import a from "../../actions/pin-message.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("pin-message: POSTs messageId to chat.pinMessage", async () => {
  const { call, json } = await run(a, { messageId: "M" });
  assertEquals(call.url, `${BASE}/chat.pinMessage`);
  assertEquals(json, { messageId: "M" });
});

Deno.test("pin-message: unpin routes to chat.unPinMessage (capital P)", async () => {
  const { call } = await run(a, { messageId: "M", unpin: true });
  assertEquals(call.url, `${BASE}/chat.unPinMessage`);
});
