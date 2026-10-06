import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import whatsappAccountsList from "../../actions/whatsapp-accounts-list.ts";

Deno.test("whatsapp-accounts-list: lists accounts", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "status": "ok", "data": { "whatsapp_accounts": [] } },
  }]);
  const out = await whatsappAccountsList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/whatsapp_accounts");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("whatsapp-accounts-list: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await whatsappAccountsList.execute!({} as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
