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

// ── Flattened optional fields ──────────────────────────────────────────────
// CC/BCC/Reply-To et al. used to live inside an n8n-shaped `additionalFields`
// group, which the studio renders as a raw JSON editor — so they were not
// reachable as form fields at all. They are flat (or in a `section`) now; the
// group survives only as a deprecated fallback, covered by the test above.

Deno.test("mail-send: cc/bcc are read from flat params", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({ ccEmail: "cc1@x.com, cc2@x.com", bccEmail: "bcc@x.com" }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.personalizations[0].cc, [{ email: "cc1@x.com" }, { email: "cc2@x.com" }]);
  assertEquals(body.personalizations[0].bcc, [{ email: "bcc@x.com" }]);
});

Deno.test("mail-send: a flat field wins over the deprecated additionalFields group", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({
      ccEmail: "new@x.com",
      additionalFields: { ccEmail: "old@x.com", bccEmail: "kept@x.com" },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.personalizations[0].cc, [{ email: "new@x.com" }]);
  // ...and a key the flat form left empty still falls back to the old group.
  assertEquals(body.personalizations[0].bcc, [{ email: "kept@x.com" }]);
});

Deno.test("mail-send: reply-to carries an optional display name", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({ replyToEmail: "reply@x.com", replyToName: "Support" }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.reply_to, { email: "reply@x.com", name: "Support" });
});

Deno.test("mail-send: custom headers and custom args are sent as string maps", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({ headers: { "X-Campaign": "spring" }, customArgs: { orderId: 42 } }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.headers, { "X-Campaign": "spring" });
  // SendGrid rejects non-string custom_args values, so numbers are coerced.
  assertEquals(body.custom_args, { orderId: "42" });
});

Deno.test("mail-send: headers accept JSON text as well as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ headers: '{"X-A":"1"}' }), ctx);
  assertEquals(JSON.parse(calls[0].body ?? "").headers, { "X-A": "1" });
});

Deno.test("mail-send: invalid header JSON rejects before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!(baseInput({ headers: "{not json" }), ctx),
    Error,
    "`headers` is not valid JSON.",
  );
  assertEquals(calls.length, 0);
});

Deno.test("mail-send: empty header/customArgs objects are omitted entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ headers: {}, customArgs: {} }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.headers, undefined);
  assertEquals(body.custom_args, undefined);
});

Deno.test("mail-send: attachments are mapped to SendGrid's shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({
      attachments: [
        {
          filename: "report.pdf",
          content: "YmFzZTY0",
          type: "application/pdf",
          disposition: "attachment",
        },
        { filename: "logo.png", content: "aW1n", disposition: "inline", contentId: "logo" },
      ],
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.attachments, [
    {
      content: "YmFzZTY0",
      filename: "report.pdf",
      type: "application/pdf",
      disposition: "attachment",
    },
    { content: "aW1n", filename: "logo.png", disposition: "inline", content_id: "logo" },
  ]);
});

Deno.test("mail-send: attachment rows missing filename or content are skipped", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(
    baseInput({
      attachments: [
        { filename: "", content: "aW1n" },
        { filename: "only-name.pdf", content: "" },
        { filename: "ok.pdf", content: "b2s=" },
      ],
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.attachments, [{ content: "b2s=", filename: "ok.pdf" }]);
});

Deno.test("mail-send: an all-blank attachment list is omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ attachments: [{ filename: "", content: "" }] }), ctx);
  assertEquals(JSON.parse(calls[0].body ?? "").attachments, undefined);
});

Deno.test("mail-send: batch id and unsubscribe group ride along", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ batchId: "batch-1", asmGroupId: 7 }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.batch_id, "batch-1");
  assertEquals(body.asm, { group_id: 7 });
});

Deno.test("mail-send: tracking toggles only send the keys that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput({ trackClicks: false }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  // An untouched `trackOpens` must stay absent so the account default wins.
  assertEquals(body.tracking_settings, { click_tracking: { enable: false } });
});

Deno.test("mail-send: untouched tracking toggles omit tracking_settings", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, headers: {} }]);
  await action.execute!(baseInput(), ctx);
  assertEquals(JSON.parse(calls[0].body ?? "").tracking_settings, undefined);
});

Deno.test("mail-send: no optional param is buried in a `group` the studio renders as JSON", () => {
  // Regression guard for the reported "SendGrid has no CC/BCC": ParamsForm
  // renders `type: "group"` as a raw JSON editor, so a group makes its children
  // invisible as fields. Sections are layout-only and render their children as
  // real inputs — those are fine.
  const walk = (list: typeof action.params): string[] =>
    (list ?? []).flatMap((p) => [
      ...(p.type === "group" && p.key !== "additionalFields" ? [p.key] : []),
      ...walk(p.children),
    ]);
  assertEquals(walk(action.params), []);
});

Deno.test("mail-send: cc/bcc/reply-to are reachable as declared fields", () => {
  const keys = new Set<string>();
  const walk = (list: typeof action.params) => {
    for (const p of list ?? []) {
      keys.add(p.key);
      walk(p.children);
    }
  };
  walk(action.params);
  for (const k of ["ccEmail", "bccEmail", "replyToEmail", "attachments", "headers"]) {
    assert(keys.has(k), `${k} must be a declared param`);
  }
});
