import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** `GET /v1/logs/email/:message_id` (scope `user_logs.read` or `domains.logs.read`). */
const getEmailLog: ActionDefinition<Input> = {
  key: "get-email-log",
  type: "read",
  resource: "email-log",
  title: "Get Stored Email",
  description: "Fetch the stored raw RFC 822 message for a sent email by its message ID (from " +
    "Search Email Logs). Account API Key (user_logs.read or domains.logs.read).",
  params: [{
    key: "messageId",
    label: "Message ID",
    type: "string",
    required: true,
    hint: "The `message_id` of a log entry.",
  }],
  output: [
    { key: "from", type: "string", label: "Sender" },
    { key: "to", type: "array", label: "Recipients" },
    { key: "rawEmail", type: "string", label: "Raw RFC 822 content" },
    { key: "collectedOn", type: "string", label: "Collected on (UTC, YYYY-MM-DD HH:MM:SS)" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/logs/email/${seg(input.messageId, "messageId")}`,
    );
    const d = (data ?? {}) as { from?: string; to?: string | string[]; raw_email?: string };
    return {
      from: d.from,
      to: Array.isArray(d.to) ? d.to : d.to ? [d.to] : [],
      rawEmail: d.raw_email,
      collectedOn: (d as { collected_on?: string }).collected_on,
    };
  },
};

export default getEmailLog;
