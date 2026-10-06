import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhooksList from "../../actions/webhooks-list.ts";

Deno.test("webhooks-list: lists webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": [] } }]);
  const out = await webhooksList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/webhooks");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("webhooks-list: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await webhooksList.execute!({} as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
