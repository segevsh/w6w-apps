import { assert, assertEquals } from "@std/assert";
import conversationCreateEmail from "../../actions/conversation-create-email.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-create-email: calls POST /v1/conversations", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { "data": { "id": 4712 } } }]);
  const out = await conversationCreateEmail.execute(
    {
      "requesterId": "11111111-2222-3333-4444-555555555555",
      "emailIntegrationId": "a@email.dixa.io",
      "subject": "Order #1",
      "content": "Where is it?",
      "language": "en",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "_type": "Email",
    "requesterId": "11111111-2222-3333-4444-555555555555",
    "emailIntegrationId": "a@email.dixa.io",
    "subject": "Order #1",
    "message": { "_type": "Inbound", "content": { "_type": "Text", "value": "Where is it?" } },
    "language": "en",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { "data": { "id": 4712 } });
});

Deno.test("conversation-create-email: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationCreateEmail.execute(
      {
        "requesterId": "11111111-2222-3333-4444-555555555555",
        "emailIntegrationId": "a@email.dixa.io",
        "subject": "Order #1",
        "content": "Where is it?",
        "language": "en",
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-create-email: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationCreateEmail.execute(
      {
        "requesterId": "11111111-2222-3333-4444-555555555555",
        "emailIntegrationId": "a",
        "subject": "s",
        "content": "c",
        "direction": "Outbound",
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("agentId"), message);
  assertEquals(calls.length, 0);
});
