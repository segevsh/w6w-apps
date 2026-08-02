import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email.ts";

Deno.test("send-email: POSTs /email with From/To/Subject/TextBody", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { To: "bob@x.com", SubmittedAt: "now", MessageID: "abc", ErrorCode: 0, Message: "OK" },
  }]);
  await action.execute(
    { from: "ada@x.com", to: "bob@x.com", subject: "Hi", textBody: "Hello" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/email");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.From, "ada@x.com");
  assertEquals(body.To, "bob@x.com");
  assertEquals(body.Subject, "Hi");
  assertEquals(body.TextBody, "Hello");
  assertEquals(body.HtmlBody, undefined);
});

Deno.test("send-email: throws when neither htmlBody nor textBody is provided", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ from: "ada@x.com", to: "bob@x.com" }, ctx)),
    Error,
    "htmlBody",
  );
});

Deno.test("send-email: forwards optional fields (tag, tracking, headers, attachments, metadata)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    {
      from: "ada@x.com",
      to: "bob@x.com",
      htmlBody: "<p>Hi</p>",
      tag: "welcome",
      trackOpens: true,
      trackLinks: "HtmlOnly",
      headers: [{ Name: "X-Custom", Value: "1" }],
      attachments: [{ Name: "f.txt", Content: "aGk=", ContentType: "text/plain" }],
      metadata: { color: "blue" },
      messageStream: "broadcast",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Tag, "welcome");
  assertEquals(body.TrackOpens, true);
  assertEquals(body.TrackLinks, "HtmlOnly");
  assertEquals(body.Headers, [{ Name: "X-Custom", Value: "1" }]);
  assertEquals(body.Attachments, [{ Name: "f.txt", Content: "aGk=", ContentType: "text/plain" }]);
  assertEquals(body.Metadata, { color: "blue" });
  assertEquals(body.MessageStream, "broadcast");
});

Deno.test('send-email: omits an empty trackLinks selection rather than sending ""', async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { from: "ada@x.com", to: "bob@x.com", htmlBody: "<p>Hi</p>", trackLinks: "" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.TrackLinks, undefined);
});
