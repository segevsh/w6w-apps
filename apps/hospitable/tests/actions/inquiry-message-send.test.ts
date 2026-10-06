import { assert, assertEquals } from "@std/assert";
import inquiryMessageSend from "../../actions/inquiry-message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inquiry-message-send: POST .../messages with body and sender", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { sent_reference_id: "r2" } } }]);
  await inquiryMessageSend.execute({ uuid: "c1", body: "Hello", sender_id: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/inquiries/c1/messages");
  assertEquals(JSON.parse(calls[0].body!), { body: "Hello", sender_id: "t1" });
  assertEquals(inquiryMessageSend.idempotent, false);
});

Deno.test("messaging: a rate-limit refusal is reported with its status", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "Too Many Attempts." } }]);
  let message = "";
  try {
    await inquiryMessageSend.execute({ uuid: "c1", body: "x" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("429") && message.includes("Too Many Attempts"), message);
});
