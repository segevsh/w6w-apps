import { assert, assertEquals } from "@std/assert";
import conversationCustomAttributesUpdate from "../../actions/conversation-custom-attributes-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-custom-attributes-update: calls PATCH /v1/conversations/4711/custom-attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "11111111-2222-3333-4444-555555555555",
        "name": "Tier",
        "identifier": "tier",
        "value": "gold",
      }],
    },
  }]);
  const out = await conversationCustomAttributesUpdate.execute(
    {
      "conversationId": 4711,
      "attributes": { "11111111-2222-3333-4444-555555555555": "gold" },
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/custom-attributes");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), { "11111111-2222-3333-4444-555555555555": "gold" });
  assertEquals(out, {
    "data": [{
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Tier",
      "identifier": "tier",
      "value": "gold",
    }],
  });
});

Deno.test("conversation-custom-attributes-update: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationCustomAttributesUpdate.execute(
      {
        "conversationId": 4711,
        "attributes": { "11111111-2222-3333-4444-555555555555": "gold" },
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-custom-attributes-update: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationCustomAttributesUpdate.execute(
      { "conversationId": 1, "attributes": { "k": 5 } } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("must be a string or an array"), message);
  assertEquals(calls.length, 0);
});
