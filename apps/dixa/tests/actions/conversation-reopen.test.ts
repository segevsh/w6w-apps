import { assert, assertEquals } from "@std/assert";
import conversationReopen from "../../actions/conversation-reopen.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-reopen: calls PUT /v1/conversations/4711/reopen", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await conversationReopen.execute({ "conversationId": 4711 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/4711/reopen");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { ok: true, conversationId: "4711" });
});

Deno.test("conversation-reopen: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationReopen.execute({ "conversationId": 4711 } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-reopen: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationReopen.execute({ "conversationId": "" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("conversationId must be"), message);
  assertEquals(calls.length, 0);
});
