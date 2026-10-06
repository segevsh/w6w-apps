import { assert, assertEquals } from "@std/assert";
import messageAdd from "../../actions/message-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-add: calls POST /v1/conversations/4711/messages", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "direction": "Outbound", "authorId": "11111111-2222-3333-4444-555555555555" },
    },
  }]);
  const out = await messageAdd.execute(
    {
      "conversationId": 4711,
      "content": "Hi",
      "contentFormat": "Markdown",
      "agentId": "11111111-2222-3333-4444-555555555555",
      "cc": "11111111-2222-3333-4444-555555555555, 11111111-2222-3333-4444-555555555556",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/messages");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "_type": "Outbound",
    "content": { "_type": "Markdown", "value": "Hi" },
    "agentId": "11111111-2222-3333-4444-555555555555",
    "cc": ["11111111-2222-3333-4444-555555555555", "11111111-2222-3333-4444-555555555556"],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, {
    "data": { "direction": "Outbound", "authorId": "11111111-2222-3333-4444-555555555555" },
  });
});

Deno.test("message-add: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await messageAdd.execute(
      {
        "conversationId": 4711,
        "content": "Hi",
        "contentFormat": "Markdown",
        "agentId": "11111111-2222-3333-4444-555555555555",
        "cc": "11111111-2222-3333-4444-555555555555, 11111111-2222-3333-4444-555555555556",
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("message-add: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await messageAdd.execute({ "conversationId": 1, "content": "hi" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("agentId"), message);
  assertEquals(calls.length, 0);
});
