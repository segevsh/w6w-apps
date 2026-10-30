import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import emailCreate, { toMessageHeaderPairs } from "../../actions/email-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("email-create: POSTs /email with the documented field names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "OK" } }]);
  const out = await emailCreate.execute(
    {
      subject: "Invoice",
      from: "Sender <sender@example.com>",
      recipient: "acme@in.parseur.com",
      bodyHtml: "<p>hi</p>",
    },
    ctx,
  ) as { message: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/email");
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Invoice",
    from: "Sender <sender@example.com>",
    recipient: "acme@in.parseur.com",
    body_html: "<p>hi</p>",
  });
  assertEquals(out.message, "OK");
});

test("email-create: message headers become [key, value] pairs on the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "OK" } }]);
  await emailCreate.execute(
    {
      subject: "s",
      from: "f@example.com",
      recipient: "acme@in.parseur.com",
      messageHeaders: { "X-Envelope-From": "orig@example.com" },
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message_headers, [["X-Envelope-From", "orig@example.com"]]);
});

test("email-create: custom parameters become query-string params", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "OK" } }]);
  await emailCreate.execute(
    {
      subject: "s",
      from: "f@example.com",
      recipient: "acme@in.parseur.com",
      customParams: { "user.name": "John" },
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url)["user.name"], "John");
});

test("toMessageHeaderPairs: empty object yields undefined, not an empty array", () => {
  assertEquals(toMessageHeaderPairs({}), undefined);
  assertEquals(toMessageHeaderPairs(undefined), undefined);
});

test("email-create: is not idempotent", () => {
  assertEquals(emailCreate.idempotent, false);
});
