import type { ActionDefinition } from "@w6w/types";
import { json, ResendClient } from "../lib/client.ts";

/**
 * `POST /emails/batch` — verified against Resend's OpenAPI document, whose
 * summary states the cap outright: "Trigger up to 100 batch emails at once."
 *
 * The payload is an array of the same objects `email-send` builds, so it is
 * taken as JSON rather than re-modelled: a batch is generated upstream by a
 * loop or a data step, not typed into a form.
 *
 * Batch does **not** support attachments or scheduling — that is Resend's
 * limitation on this endpoint, not an omission here.
 */
const action: ActionDefinition = {
  key: "email-send-batch",
  type: "perform",
  resource: "email",
  title: "Send a batch of emails",
  description: "Send up to 100 emails in one request.",
  // Same reasoning as email-send: the idempotency key makes a retry replay
  // rather than duplicate.
  idempotent: true,
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "json",
      required: true,
      default: "",
      placeholder:
        '[{"from":"Acme <hello@example.com>","to":"a@example.com","subject":"Hi","html":"<p>Hi</p>"}]',
      hint: "An array of email objects. Resend accepts at most 100, without attachments.",
    },
    {
      key: "idempotencyKey",
      label: "Idempotency Key",
      type: "string",
      default: "",
      hint: "Leave blank to use this step's invocation id.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Created emails" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emails = json(p.emails, "emails");
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error("`emails` is required — a non-empty array of email objects");
    }
    if (emails.length > 100) {
      // Resend's own documented cap. Failing here names the limit.
      throw new Error(`Resend accepts at most 100 emails per batch — got ${emails.length}`);
    }

    const idempotencyKey = String(p.idempotencyKey ?? "").trim() ||
      ctx.invocation?.invocationId;

    ctx.log("info", "sending email batch via Resend", { count: emails.length });

    return await new ResendClient(ctx).request("/emails/batch", {
      method: "POST",
      // The batch endpoint takes the bare array as its whole body.
      body: emails,
      idempotencyKey,
    });
  },
};

export default action;
