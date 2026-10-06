import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, sendResult, SolapiClient } from "../lib/client.ts";

/**
 * Send Kakao AlimTalk — Send one Kakao AlimTalk message from an approved template, filling its #{variable} placeholders. Optionally falls back to SMS/LMS if the AlimTalk fails (needs a registered sender number).
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  to: string;
  pfId: string;
  templateId: string;
  variables?: unknown;
  from?: string;
  disableSms?: boolean;
  scheduledDate?: string;
}

const sendAlimtalk: ActionDefinition<Input> = {
  key: "send-alimtalk",
  type: "perform",
  resource: "message",
  title: "Send Kakao AlimTalk",
  description:
    "Send one Kakao AlimTalk message from an approved template, filling its #{variable} placeholders. Optionally falls back to SMS/LMS if the AlimTalk fails (needs a registered sender number).",
  idempotent: false,
  params: [
    {
      "key": "to",
      "label": "To",
      "type": "string",
      "required": true,
      "hint": "Recipient number, digits only.",
    },
    {
      "key": "pfId",
      "label": "Kakao channel ID (pfId)",
      "type": "string",
      "required": true,
      "hint": "The channelId of a linked Kakao channel (see List Kakao Channels).",
    },
    {
      "key": "templateId",
      "label": "Template ID",
      "type": "string",
      "required": true,
      "hint": "An APPROVED AlimTalk template (see List Kakao Templates).",
    },
    {
      "key": "variables",
      "label": "Variables",
      "type": "json",
      "hint":
        'Object mapping each template placeholder, including its #{ }, to a value: {"#{name}":"Hong"}.',
    },
    {
      "key": "from",
      "label": "Fallback sender number",
      "type": "string",
      "hint": "Required for the SMS fallback to work; may be empty if fallback is disabled.",
    },
    {
      "key": "disableSms",
      "label": "Disable SMS fallback",
      "type": "boolean",
      "hint":
        "Default false: a failed AlimTalk is re-sent as SMS/LMS and the AlimTalk charge refunded. true leaves it failed.",
    },
    {
      "key": "scheduledDate",
      "label": "Scheduled date",
      "type": "string",
      "hint":
        "ISO 8601 with a time zone, e.g. 2026-10-07T09:00:00+09:00. A time in the past sends immediately. Balance is deducted at send time, but the daily send limit counts at scheduling time.",
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
    const body = await new SolapiClient(ctx).json("/messages/v4/send-many/detail", {
      method: "POST",
      body: compact({
        messages: [{
          to: input.to,
          from: input.from,
          type: "ATA",
          kakaoOptions: compact({
            pfId: input.pfId,
            templateId: input.templateId,
            variables: parseJsonParam(input.variables, "variables"),
            disableSms: input.disableSms,
          }),
        }],
        scheduledDate: input.scheduledDate,
        showMessageList: true,
      }),
    });
    return sendResult(body);
  },
};

export default sendAlimtalk;
