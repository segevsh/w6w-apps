import { assert, assertEquals } from "@std/assert";
import conversationTagList from "../../actions/conversation-tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-tag-list: calls GET /v1/conversations/4711/tags", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": "11111111-2222-3333-4444-555555555555", "name": "vip", "state": "Active" }],
    },
  }]);
  const out = await conversationTagList.execute({ "conversationId": 4711 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/tags");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "id": "11111111-2222-3333-4444-555555555555", "name": "vip", "state": "Active" }],
  });
});

Deno.test("conversation-tag-list: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationTagList.execute({ "conversationId": 4711 } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-tag-list: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationTagList.execute({ "conversationId": "1.5" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("conversationId must be"), message);
  assertEquals(calls.length, 0);
});
