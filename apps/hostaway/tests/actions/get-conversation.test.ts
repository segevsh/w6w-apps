import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-conversation.ts";

Deno.test("get-conversation: GETs /v1/conversations/{id}", async () => {
  const { ctx, calls } = mockCtx([envelope({ reservationId: 2, type: "host-guest-email" })]);
  const conversation = await action.execute({ conversationId: 1406 }, ctx) as { type: string };
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/conversations/1406");
  assertEquals(conversation.type, "host-guest-email");
});

Deno.test("get-conversation: refuses a call without a conversation id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "conversationId");
});
