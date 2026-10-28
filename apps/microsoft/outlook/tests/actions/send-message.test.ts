import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs the message wrapped under `message` to /me/sendMail", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({
    to: ["a@b.com"],
    subject: "hi",
    bodyContent: "hello",
    bodyType: "Text",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/sendMail");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.subject, "hi");
  assertEquals(body.message.body, { contentType: "Text", content: "hello" });
  assertEquals(body.message.toRecipients, [{ emailAddress: { address: "a@b.com" } }]);
  assertEquals(out, { status: 202 });
});

Deno.test("send-message: only sends saveToSentItems when it is false", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: undefined },
    { status: 202, body: undefined },
  ]);

  await action.execute({ to: ["a@b.com"], saveToSentItems: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).saveToSentItems, undefined);

  await action.execute({ to: ["a@b.com"], saveToSentItems: false }, ctx);
  assertEquals(JSON.parse(calls[1].body!).saveToSentItems, false);
});

Deno.test("send-message: is not idempotent — sendMail has no dedupe key", () => {
  assertEquals(action.idempotent, false);
});
