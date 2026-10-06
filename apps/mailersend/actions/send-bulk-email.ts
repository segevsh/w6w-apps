import type { ActionDefinition } from "@w6w/types";
import { MailerSendClient } from "../lib/client.ts";

interface Input {
  emails: unknown;
}

const sendBulkEmail: ActionDefinition<Input> = {
  key: "send-bulk-email",
  type: "perform",
  resource: "email",
  title: "Send Bulk Email",
  description:
    "Send up to 500 independent emails in one request (POST /v1/bulk-email). Validation and suppression errors are not returned here: they are stored against the returned `bulkEmailId`, so follow up with Get Bulk Email Status. Needs a Hobby plan or higher; limited to 10 requests a minute.",
  idempotent: false,
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "json",
      required: true,
      hint:
        "An array of email objects, each in the wire shape of Send Email (`from`, `to`, `subject`, `html`/`text`/`template_id`, `personalization`, …). 500 per request (5 on a sandbox account), 50 MB total.",
    },
  ],
  output: [
    { key: "bulkEmailId", type: "string", label: "Id to poll with Get Bulk Email Status" },
    { key: "message", type: "string", label: "The API's confirmation sentence" },
  ],

  async execute(input, ctx) {
    if (!Array.isArray(input.emails) || input.emails.length === 0) {
      throw new Error("emails must be a non-empty array of email objects");
    }
    const body = await new MailerSendClient(ctx).json<
      { bulk_email_id?: string; message?: string }
    >("/bulk-email", { method: "POST", body: input.emails });
    return { bulkEmailId: body.bulk_email_id ?? null, message: body.message ?? null };
  },
};

export default sendBulkEmail;
