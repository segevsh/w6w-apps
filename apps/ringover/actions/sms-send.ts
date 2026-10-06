import type { ActionDefinition } from "@w6w/types";
import { compact, RingoverClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  toNumber: string;
  content: string;
  scheduledAt?: string;
  userIdForced?: number;
  archivedAuto?: boolean;
}

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description:
    "Send an SMS from one of the team's SMS-capable numbers. Needs Conversations Write on the key; consumes SMS credit.",
  idempotent: false,
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      hint: "A team number with SMS enabled, international format.",
    },
    {
      key: "toNumber",
      label: "To number",
      type: "string",
      required: true,
      hint: "Recipient, international format.",
    },
    { key: "content", label: "Message", type: "text", required: true },
    {
      key: "scheduledAt",
      label: "Send at (UTC)",
      type: "string",
      hint: "Optional ISO 8601 UTC timestamp to schedule the SMS.",
    },
    {
      key: "userIdForced",
      label: "Send as user ID",
      type: "number",
      hint: "Send on behalf of another user in the team.",
      validation: { integer: true },
    },
    { key: "archivedAuto", label: "Archive conversation automatically", type: "boolean" },
  ],
  output: [
    { key: "message_id", type: "number", label: "Message ID" },
    { key: "conv_id", type: "number", label: "Conversation ID" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("POST", "/push/sms", {
      body: compact({
        from_number: String(input.fromNumber).trim(),
        to_number: String(input.toNumber).trim(),
        content: input.content,
        scheduled_at: input.scheduledAt,
        user_id_forced: input.userIdForced,
        archived_auto: input.archivedAuto,
      }),
    });
  },
};

export default smsSend;
