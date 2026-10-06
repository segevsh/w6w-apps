import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/whatsapp-balance-get.ts";
import { jsonBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whatsapp-balance-get: POST fetchPrepaidBalance and maps the fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      number: "+9199999999",
      status: "success",
      plan_status: "active",
      prepaid_balance: 250.75,
    },
  }]);
  const out = await action.execute({ integratedNumber: "919999999999" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/subscriptions/fetchPrepaidBalance");
  assertEquals(jsonBody(calls[0]), { integrated_number: "919999999999", service: "whatsapp" });
  assertEquals(out, { prepaidBalance: 250.75, planStatus: "active", number: "+9199999999" });
});

Deno.test("whatsapp-balance-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", prepaid_balance: 1 } }]);
  await action.execute({ integratedNumber: "9199" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("whatsapp-balance-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ integratedNumber: "9199" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
