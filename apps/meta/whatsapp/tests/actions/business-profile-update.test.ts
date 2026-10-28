import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/business-profile-update.ts";

Deno.test("business-profile-update: POSTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute({ about: "We sell widgets.", vertical: "RETAIL" }, ctx);
  assertEquals(out, { success: true });
  assertEquals(JSON.parse(calls[0].body!), {
    messaging_product: "whatsapp",
    about: "We sell widgets.",
    vertical: "RETAIL",
  });
});

Deno.test("business-profile-update: splits a comma-separated websites field", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ websites: "https://example.com, https://shop.example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).websites, [
    "https://example.com",
    "https://shop.example.com",
  ]);
});

Deno.test("business-profile-update: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
