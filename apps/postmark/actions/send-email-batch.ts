import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch, postmarkJsonInit } from "../lib/client.ts";

interface Input {
  messages: Array<Record<string, unknown>>;
}

interface BatchResult {
  ErrorCode: number;
  Message: string;
  To?: string;
  SubmittedAt?: string;
  MessageID?: string;
}

/**
 * `POST /email/batch` — send up to 500 messages in one call (50 MB payload
 * limit). Each entry has the same shape as `send-email`'s payload (`From`,
 * `To`, `HtmlBody`/`TextBody`, ...) — accepted here as raw JSON per message
 * so the whole batch can be assembled upstream (e.g. by a prior Function).
 * Postmark returns HTTP 200 even when individual messages fail validation;
 * check each result's `ErrorCode`.
 * https://postmarkapp.com/developer/api/email-api#send-batch-emails
 */
const sendEmailBatch: ActionDefinition<Input, BatchResult[]> = {
  key: "send-email-batch",
  type: "perform",
  resource: "message",
  title: "Send Email Batch",
  description:
    "Send up to 500 emails in one call. Each result carries its own ErrorCode — a 200 response " +
    "does not mean every message succeeded.",
  idempotent: false,
  params: [
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "JSON array of message objects, each shaped like the send-email payload: " +
        '`[{"From": "...", "To": "...", "Subject": "...", "HtmlBody": "..."}]`.',
    },
  ],
  output: [
    { key: "ErrorCode", type: "number", label: "Error Code" },
    { key: "Message", type: "string", label: "Status Message" },
    { key: "MessageID", type: "string", label: "Message ID" },
  ],

  async execute(input, ctx) {
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new Error("send-email-batch requires a non-empty `messages` array");
    }
    return await postmarkFetch<BatchResult[]>(
      ctx,
      "/email/batch",
      postmarkJsonInit("POST", input.messages),
    );
  },
};

export default sendEmailBatch;
