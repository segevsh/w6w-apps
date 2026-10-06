import { assert, assertEquals } from "@std/assert";
import conversationAssign from "../../actions/conversation-assign.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-assign: calls PUT /v1/conversations/4711/claim", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await conversationAssign.execute(
    {
      "conversationId": 4711,
      "agentId": "11111111-2222-3333-4444-555555555555",
      "force": true,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/claim");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "agentId": "11111111-2222-3333-4444-555555555555",
    "force": true,
  });
  assertEquals(out, { ok: true, conversationId: "4711" });
});

Deno.test("conversation-assign: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationAssign.execute(
      {
        "conversationId": 4711,
        "agentId": "11111111-2222-3333-4444-555555555555",
        "force": true,
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-assign: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationAssign.execute({ "conversationId": 1, "agentId": " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("agentId is required"), message);
  assertEquals(calls.length, 0);
});
