import { assertEquals } from "@std/assert";
import whatsappGet from "../../actions/whatsapp-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whatsapp-get: returns the unwrapped message with events", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ id: "w1", status: "DELIVERED", events: [{ event_type: "SENT" }] }),
  }]);
  const out = await whatsappGet.execute({ id: "w1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/whatsapp/messages/w1");
  assertEquals(out.status, "DELIVERED");
  assertEquals((out.events as unknown[]).length, 1);
});
