import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email.ts";

const OK = { body: { Messages: [{ Status: "success", To: [{ MessageID: 1 }] }] } };

Deno.test("send-email: POSTs to the v3.1 send endpoint", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", textPart: "hi" }, ctx);
  assertEquals(calls[0].url, "https://api.mailjet.com/v3.1/send");
  assertEquals(calls[0].method, "POST");
});

Deno.test("send-email: wraps one message in the Messages array with capitalised fields", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "Ada <a@x.com>", to: "b@x.com", subject: "Hi", textPart: "t", htmlPart: "<p>h</p>" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Messages.length, 1);
  assertEquals(body.Messages[0], {
    From: { Email: "a@x.com", Name: "Ada" },
    To: [{ Email: "b@x.com" }],
    Subject: "Hi",
    TextPart: "t",
    HTMLPart: "<p>h</p>",
  });
});

Deno.test("send-email: parses multi-recipient To, Cc and Bcc", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({
    from: "a@x.com",
    to: "b@x.com, Carol <c@x.com>",
    cc: "d@x.com",
    bcc: "e@x.com",
    textPart: "t",
  }, ctx);
  const msg = JSON.parse(calls[0].body!).Messages[0];
  assertEquals(msg.To, [{ Email: "b@x.com" }, { Email: "c@x.com", Name: "Carol" }]);
  assertEquals(msg.Cc, [{ Email: "d@x.com" }]);
  assertEquals(msg.Bcc, [{ Email: "e@x.com" }]);
});

Deno.test("send-email: omits Cc/Bcc/ReplyTo entirely when not supplied", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", textPart: "t" }, ctx);
  const msg = JSON.parse(calls[0].body!).Messages[0];
  assert(!("Cc" in msg), "empty Cc should be omitted, not sent as []");
  assert(!("Bcc" in msg), "empty Bcc should be omitted, not sent as []");
  assert(!("ReplyTo" in msg));
});

Deno.test("send-email: forwards CustomID, Variables and attachments", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({
    from: "a@x.com",
    to: "b@x.com",
    textPart: "t",
    customId: "order-42",
    variables: { name: "Ada" },
    attachments: [{ ContentType: "text/plain", Filename: "a.txt", Base64Content: "aGk=" }],
  }, ctx);
  const msg = JSON.parse(calls[0].body!).Messages[0];
  assertEquals(msg.CustomID, "order-42");
  assertEquals(msg.Variables, { name: "Ada" });
  assertEquals(msg.Attachments.length, 1);
});

Deno.test("send-email: SandboxMode rides on the envelope, not the message", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", textPart: "t", sandboxMode: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.SandboxMode, true);
  assert(!("SandboxMode" in body.Messages[0]), "SandboxMode belongs on the envelope");
});

Deno.test("send-email: omits SandboxMode when false or absent", async () => {
  const { ctx, calls } = mockCtx([OK, OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", textPart: "t" }, ctx);
  assert(!("SandboxMode" in JSON.parse(calls[0].body!)));
  await action.execute!({ from: "a@x.com", to: "b@x.com", textPart: "t", sandboxMode: false }, ctx);
  assert(!("SandboxMode" in JSON.parse(calls[1].body!)));
});

Deno.test("send-email: a per-message error inside HTTP 200 is returned, not thrown", async () => {
  // This is the trap the action's description warns about — the client must not
  // treat the 200 as a failure, and must not swallow the Errors array either.
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      Messages: [{
        Status: "error",
        Errors: [{ ErrorCode: "send-0003", ErrorMessage: "At least HTMLPart or TextPart" }],
      }],
    },
  }]);
  const result = await action.execute!({ from: "a@x.com", to: "b@x.com" }, ctx) as {
    Messages: Array<{ Status: string; Errors: unknown[] }>;
  };
  assertEquals(result.Messages[0].Status, "error");
  assertEquals(result.Messages[0].Errors.length, 1);
});
