import { assert, assertEquals } from "@std/assert";
import conversationTagAdd from "../../actions/conversation-tag-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-tag-add: calls PUT /v1/conversations/4711/tags/11111111-2222-3333-4444-555555555555", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await conversationTagAdd.execute(
    { "conversationId": 4711, "tagId": "11111111-2222-3333-4444-555555555555" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(
    pathOf(calls[0].url),
    "/v1/conversations/4711/tags/11111111-2222-3333-4444-555555555555",
  );
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    ok: true,
    conversationId: "4711",
    tagId: "11111111-2222-3333-4444-555555555555",
  });
});

Deno.test("conversation-tag-add: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationTagAdd.execute(
      { "conversationId": 4711, "tagId": "11111111-2222-3333-4444-555555555555" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-tag-add: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationTagAdd.execute({ "conversationId": 1, "tagId": "" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("tagId is required"), message);
  assertEquals(calls.length, 0);
});
