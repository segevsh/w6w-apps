import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, sendResult, SolapiClient } from "../lib/client.ts";

/**
 * Send Messages — Send a batch of messages in one request (SMS, LMS, MMS, Kakao AlimTalk, RCS and others, each message carrying its own type). SOLAPI recommends the group flow above 10,000 messages. A message in failedMessageList was not sent even though the call succeeded.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  messages: unknown;
  scheduledDate?: string;
  strict?: boolean;
  allowDuplicates?: boolean;
}

const sendMessages: ActionDefinition<Input> = {
  key: "send-messages",
  type: "perform",
  resource: "message",
  title: "Send Messages",
  description:
    "Send a batch of messages in one request (SMS, LMS, MMS, Kakao AlimTalk, RCS and others, each message carrying its own type). SOLAPI recommends the group flow above 10,000 messages. A message in failedMessageList was not sent even though the call succeeded.",
  idempotent: false,
  params: [
    {
      "key": "messages",
      "label": "Messages",
      "type": "json",
      "required": true,
      "hint":
        'Array of message objects exactly as SOLAPI documents them: [{"to":"01012345678","from":"029302266","text":"..."}]. See the Send Messages reference for kakaoOptions, rcsOptions, replacements and the other per-message fields.',
    },
    {
      "key": "scheduledDate",
      "label": "Scheduled date",
      "type": "string",
      "hint":
        "ISO 8601 with a time zone, e.g. 2026-10-07T09:00:00+09:00. A time in the past sends immediately. Balance is deducted at send time, but the daily send limit counts at scheduling time.",
    },
    {
      "key": "strict",
      "label": "Strict validation",
      "type": "boolean",
      "hint":
        "Default false: SOLAPI silently strips invalid characters and derives a missing LMS/MMS subject from the text. true rejects such messages instead.",
    },
    {
      "key": "allowDuplicates",
      "label": "Allow duplicate recipients",
      "type": "boolean",
      "hint": "Default false: a recipient number repeated inside the same batch is dropped.",
    },
  ],
  output: [
    {
      "key": "groupId",
      "type": "string",
      "label": "Group the message was filed under",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Group status (PENDING, SENDING, COMPLETE, SCHEDULED, ...)",
    },
    {
      "key": "count",
      "type": "object",
      "label": "Group counters (total, sentTotal, sentFailed, registeredFailed, ...)",
    },
    {
      "key": "failedCount",
      "type": "number",
      "label": "Messages SOLAPI refused to register",
    },
    {
      "key": "failedMessageList",
      "type": "array",
      "label": "Messages that were NOT sent, each with a statusCode and statusMessage",
    },
    {
      "key": "messageList",
      "type": "array",
      "label": "Registered messages with their messageId and statusCode",
    },
  ],

  async execute(input, ctx) {
    const messages = parseJsonParam(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("SOLAPI: messages must be a non-empty array");
    }
    const body = await new SolapiClient(ctx).json("/messages/v4/send-many/detail", {
      method: "POST",
      body: compact({
        messages,
        scheduledDate: input.scheduledDate,
        strict: input.strict,
        allowDuplicates: input.allowDuplicates,
        showMessageList: true,
      }),
    });
    return sendResult(body);
  },
};

export default sendMessages;
