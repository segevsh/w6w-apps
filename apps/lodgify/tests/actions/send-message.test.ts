import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import sendMessage from "../../actions/send-message.ts";

Deno.test("send-message: POSTs a one-element array to the booking or enquiry messages path", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }, { body: undefined }]);
  await sendMessage.execute({
    target: "booking",
    id: 4,
    message: "Welcome!",
    subject: "Hi",
    sendNotification: true,
  }, ctx);
  await sendMessage.execute({ target: "enquiry", id: 5, message: "Note", type: "Comment" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking/4/messages");
  assertEquals(JSON.parse(calls[0].body!), [
    { message: "Welcome!", type: "Owner", subject: "Hi", send_notification: true },
  ]);
  assertEquals(pathOf(calls[1].url), "/v1/reservation/enquiry/5/messages");
  assertEquals(JSON.parse(calls[1].body!), [{ message: "Note", type: "Comment" }]);
});

Deno.test("send-message: refuses an unknown target", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(sendMessage.execute({ target: "user", id: 1, message: "x" }, ctx)),
    Error,
    "target",
  );
  assertEquals(calls.length, 0);
});
