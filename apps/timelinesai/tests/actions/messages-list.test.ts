import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messagesList from "../../actions/messages-list.ts";

Deno.test("messages-list: lists with no filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "messages": [] } } }]);
  const out = await messagesList.execute!({ "chatId": 5 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats/5/messages");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("messages-list: maps the filters, keeping from_me=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": {} } }]);
  const out = await messagesList.execute!(
    { "chatId": 5, "fromMe": false, "afterMessage": "u1", "sortingOrder": "asc" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://app.timelines.ai/integrations/api/chats/5/messages?from_me=false&after_message=u1&sorting_order=asc",
  );
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("messages-list: refuses an empty path id before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await messagesList.execute!({ "chatId": "" } as never, ctx);
  }, Error);
  assert(err.message.includes("empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("messages-list: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await messagesList.execute!({ "chatId": 5 } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
