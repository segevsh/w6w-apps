import { assert, assertEquals, assertRejects } from "@std/assert";
import emailSend from "../../actions/email-send.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof emailSend.execute>[1], input: Record<string, unknown>) =>
  emailSend.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-send: declares a non-idempotent perform action", () => {
  assertEquals(emailSend.key, "email-send");
  assertEquals(emailSend.type, "perform");
  assertEquals(emailSend.idempotent, false);
  assert((emailSend.description ?? "").length > 0);
  assert(Array.isArray(emailSend.output) && emailSend.output.length > 0);
});

Deno.test("email-send: a template send posts the documented body and returns ok on 202", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  const out = await run(ctx, {
    to: "r@x.com",
    template: "Welcome Email",
    templateProperties: '{"loginURL":"https://x.test/l"}',
    unsubscribeCheck: false,
    utmTags: false,
    cc: "c@x.com",
    bcc: "b@x.com",
  });
  assertEquals(out, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/emails/send");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    to: "r@x.com",
    template: "Welcome Email",
    templateProperties: { loginURL: "https://x.test/l" },
    unsubscribeCheck: false,
    UTMTags: false,
    cc: "c@x.com",
    bcc: "b@x.com",
  });
  assertEquals(calls[0].headers["x-encharge-token"], undefined);
});

Deno.test("email-send: a numeric template is sent as a number; sender and reply names become objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await run(ctx, {
    toUserId: "42",
    template: "123",
    from: "s@x.com",
    fromName: "Sam",
    replyTo: "r@x.com",
    replyToName: "Reply",
  });
  assertEquals(JSON.parse(calls[0].body!), {
    to: { userId: "42" },
    template: 123,
    from: { email: "s@x.com", name: "Sam" },
    reply: { email: "r@x.com", name: "Reply" },
  });
});

Deno.test("email-send: html and text bodies carry the subject; plain strings stay strings", async () => {
  const html = mockCtx([{ status: 202 }]);
  await run(html.ctx, { to: "r@x.com", from: "s@x.com", subject: "Hi", html: "<b>x</b>" });
  assertEquals(JSON.parse(html.calls[0].body!), {
    to: "r@x.com",
    from: "s@x.com",
    subject: "Hi",
    html: "<b>x</b>",
  });
  const text = mockCtx([{ status: 202 }]);
  await run(text.ctx, { to: "r@x.com", from: "s@x.com", subject: "Hi", text: "x" });
  assertEquals(JSON.parse(text.calls[0].body!).text, "x");
});

Deno.test("email-send: needs exactly one body source and a recipient, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => run(ctx, { to: "r@x.com" }), Error, "exactly one");
  await assertRejects(
    () => run(ctx, { to: "r@x.com", html: "a", text: "b" }),
    Error,
    "exactly one",
  );
  await assertRejects(() => run(ctx, { text: "b" }), Error, "`to`");
  assertEquals(calls.length, 0);
});

Deno.test("email-send: an Encharge failure is thrown with its message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errBody("Missing email content. Please pass `template`, `html` or `text`"),
  }]);
  await assertRejects(() => run(ctx, { to: "r@x.com", text: "x" }), Error, "Missing email content");
});
