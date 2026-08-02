import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mail-send.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    fromEmail: "sender@example.com",
    toEmail: "rcpt@example.com",
    subject: "hello",
    contentValue: "body",
    contentType: "text/plain",
    ...overrides,
  };
}

Deno.test("mail-send: happy path posts to /v3/mail/send with minimal payload", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, headers: { "x-message-id": "mid-123" } },
  ]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/mail/send");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");

  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.personalizations, [{ to: [{ email: "rcpt@example.com" }] }]);
  assertEquals(body.from, { email: "sender@example.com" });
  assertEquals(body.subject, "hello");
  assertEquals(body.content, [{ type: "text/plain", value: "body" }]);

  assertEquals(result, { accepted: true, statusCode: 202, messageId: "mid-123" });
});

Deno.test("mail-send: fromName is included when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ fromName: "Alice" }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.from, { email: "sender@example.com", name: "Alice" });
});

Deno.test("mail-send: splits comma-separated toEmail into multiple recipients", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ toEmail: "a@x.com, b@x.com ,c@x.com" }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.personalizations[0].to, [
    { email: "a@x.com" },
    { email: "b@x.com" },
    { email: "c@x.com" },
  ]);
});

Deno.test("mail-send: cc/bcc/replyTo/categories/sandbox/ipPool from additionalFields", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({
      additionalFields: {
        ccEmail: "cc1@x.com,cc2@x.com",
        bccEmail: "bcc@x.com",
        replyToEmail: "reply@x.com",
        categories: "cat-a, cat-b",
        enableSandbox: true,
        ipPoolName: "pool-1",
      },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.personalizations[0].cc, [
    { email: "cc1@x.com" },
    { email: "cc2@x.com" },
  ]);
  assertEquals(body.personalizations[0].bcc, [{ email: "bcc@x.com" }]);
  assertEquals(body.reply_to, { email: "reply@x.com" });
  assertEquals(body.categories, ["cat-a", "cat-b"]);
  assertEquals(body.mail_settings, { sandbox_mode: { enable: true } });
  assertEquals(body.ip_pool_name, "pool-1");
});

Deno.test("mail-send: sendAt is converted to a unix timestamp (seconds)", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  const iso = "2026-07-01T00:00:00Z";
  await action.execute!(baseInput({ additionalFields: { sendAt: iso } }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.send_at, Math.floor(new Date(iso).getTime() / 1000));
});

Deno.test("mail-send: missing required fields reject with informative errors", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["fromEmail", { fromEmail: "" }],
    ["toEmail", { toEmail: "" }],
    ["subject", { subject: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx } = mockCtx();
    await assertRejects(
      async () => await action.execute!(baseInput(patch), ctx),
      Error,
      `\`${field}\``,
    );
  }
});

Deno.test("mail-send: dynamic template sends template_id + dynamic_template_data", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({
      dynamicTemplate: true,
      templateId: "d-abc123",
      dynamicTemplateFields: { first_name: "James" },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.template_id, "d-abc123");
  assertEquals(body.personalizations[0].dynamic_template_data, { first_name: "James" });
  // The template supplies the body — inline content is not sent.
  assertEquals(body.content, undefined);
});

Deno.test("mail-send: dynamic template accepts key/value pair shapes", async () => {
  for (
    const fields of [
      { fields: [{ key: "first_name", value: "James" }] },
      [{ key: "first_name", value: "James" }],
      '{"first_name":"James"}',
    ]
  ) {
    const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
    await action.execute!(
      baseInput({ dynamicTemplate: true, templateId: "d-abc123", dynamicTemplateFields: fields }),
      ctx,
    );
    const body = JSON.parse(calls[0].body ?? "");
    assertEquals(body.personalizations[0].dynamic_template_data, { first_name: "James" });
  }
});

Deno.test("mail-send: dynamic template without a template id rejects", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        baseInput({ dynamicTemplate: true, dynamicTemplateFields: { first_name: "James" } }),
        ctx,
      ),
    Error,
    "Dynamic Template ID",
  );
  assertEquals(calls.length, 0, "must not call SendGrid with un-rendered handlebars");
});

Deno.test("mail-send: contentValue is optional when a dynamic template is used", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({ contentValue: "", dynamicTemplate: true, templateId: "d-abc123" }),
    ctx,
  );
  assertEquals(calls.length, 1);
});

Deno.test("mail-send: contentValue is optional even without a dynamic template — sends a blank body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ contentValue: "" }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.content, [{ type: "text/plain", value: "" }]);
});

Deno.test("mail-send: templateId is declared required, so the Configure UI can flag a missing one before Test — not just execute()", () => {
  // Safe to declare `required: true` alongside `showIf` here because the
  // studio Test-gate (`requiredParamsFilled`) skips a required param while
  // it's hidden — see packages/ui/src/StepBuilderModal.required-gate.test.ts.
  // Before that fix this app deliberately left it non-required to avoid
  // blocking the gate in the branch where it's moot, which meant a
  // half-configured step only failed at runtime with a raw `hook_failed`.
  // `contentValue` is NOT required (unlike an earlier revision of this fix) —
  // SendGrid accepts a blank body, so the platform shouldn't block one.
  const contentValue = action.params?.find((p) => p.key === "contentValue");
  const templateId = action.params?.find((p) => p.key === "templateId");
  assertEquals(contentValue?.required, undefined);
  assertEquals(templateId?.required, true);
});

Deno.test("mail-send: non-2xx response propagates as Error", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: '{"errors":[{"message":"unauth"}]}', headers: {} },
  ]);
  const err = await assertRejects(
    async () => await action.execute!(baseInput(), ctx),
    Error,
    "returned 401",
  );
  assert(err.message.includes("unauth"), "should include upstream error text");
});
