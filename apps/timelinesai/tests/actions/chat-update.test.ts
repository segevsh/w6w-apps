import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import chatUpdate from "../../actions/chat-update.ts";

Deno.test("chat-update: patches only the supplied fields, keeping false", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "id": 7 } } }]);
  const out = await chatUpdate.execute!(
    { "chatId": 7, "closed": false, "name": "Acme" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats/7");
  assertEquals(JSON.parse(calls[0].body!), { "name": "Acme", "closed": false });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("chat-update: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await chatUpdate.execute!({ "chatId": 7, "closed": false, "name": "Acme" } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("chat-update: refuses an update that changes nothing, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await chatUpdate.execute!({ chatId: 7 } as never, ctx);
  }, Error);
  assert(err.message.includes("at least one"), err.message);
  assertEquals(calls.length, 0);
});
