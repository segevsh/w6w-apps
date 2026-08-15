import type { ActionDefinition, Param } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface MessageSendInput {
  accountId?: string;
  fromAddress: string;
  toAddress: string;
  ccAddress?: string;
  bccAddress?: string;
  subject?: string;
  content?: string;
  mailFormat?: "html" | "plaintext";
  askReceipt?: "yes" | "no";
  encoding?: string;
  isSchedule?: boolean;
  scheduleType?: number;
  timeZone?: string;
  scheduleTime?: string;
}

interface MessageSendOutput {
  messageId: string;
  subject: string;
}

const scheduleTypeOptions = [
  { value: 1, label: "1 hour from now" },
  { value: 2, label: "2 hours from now" },
  { value: 3, label: "4 hours from now" },
  { value: 4, label: "Tomorrow morning" },
  { value: 5, label: "Tomorrow afternoon" },
  { value: 6, label: "Custom date and time" },
];

/**
 * The vendor's own encoding list. `UTF-8` (the default) covers virtually
 * every case; the rest exist for interop with a recipient's mail client that
 * mis-detects anything else.
 */
const encodingOptions = [
  "Big5",
  "EUC-JP",
  "EUC-KR",
  "GB2312",
  "ISO-2022-JP",
  "ISO-8859-1",
  "KOI8-R",
  "Shift_JIS",
  "US-ASCII",
  "UTF-8",
  "WINDOWS-1251",
  "X-WINDOWS-ISO2022JP",
].map((v) => ({ value: v, label: v }));

const scheduleSection: Param = {
  key: "schedule",
  label: "Schedule for later",
  type: "section",
  section: "collapsible",
  title: "Schedule for later",
  collapsed: true,
  children: [
    {
      key: "isSchedule",
      label: "Schedule this email",
      type: "boolean",
      hint: "Off sends immediately. On requires scheduleType (and timeZone + scheduleTime for a " +
        "custom time).",
    },
    { key: "scheduleType", label: "When", type: "select", options: scheduleTypeOptions },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      placeholder: "Asia/Calcutta",
      hint: "Required when When is Custom date and time.",
    },
    {
      key: "scheduleTime",
      label: "Custom date and time",
      type: "string",
      placeholder: "09/15/2026 14:30:28",
      hint: "Format MM/DD/YYYY HH:MM:SS. Required when When is Custom date and time.",
    },
  ],
};

/** `POST /api/accounts/{accountId}/messages` — "Send an Email". */
const messageSend: ActionDefinition<MessageSendInput, MessageSendOutput> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Email",
  description: "Send an email, optionally scheduled for later.",
  idempotent: false,
  params: [
    accountIdParam,
    {
      key: "fromAddress",
      label: "From",
      type: "string",
      required: true,
      hint: "Must be an address (or alias) that belongs to the authenticated account.",
    },
    { key: "toAddress", label: "To", type: "string", required: true },
    { key: "ccAddress", label: "Cc", type: "string" },
    { key: "bccAddress", label: "Bcc", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    { key: "content", label: "Content", type: "text", config: { multiline: true } },
    {
      key: "mailFormat",
      label: "Format",
      type: "select",
      default: "html",
      options: [{ value: "html", label: "HTML" }, { value: "plaintext", label: "Plain text" }],
    },
    {
      key: "askReceipt",
      label: "Request read receipt",
      type: "select",
      advanced: true,
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
    {
      key: "encoding",
      label: "Content encoding",
      type: "select",
      advanced: true,
      default: "UTF-8",
      options: encodingOptions,
    },
    scheduleSection,
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const message = await new ZohoMailClient(ctx).request<MessageSendOutput>(
      `/accounts/${encodeURIComponent(accountId)}/messages`,
      {
        method: "POST",
        body: compact({
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          ccAddress: input.ccAddress,
          bccAddress: input.bccAddress,
          subject: input.subject,
          content: input.content,
          mailFormat: input.mailFormat,
          askReceipt: input.askReceipt,
          encoding: input.encoding,
          isSchedule: input.isSchedule,
          scheduleType: input.scheduleType,
          timeZone: input.timeZone,
          scheduleTime: input.scheduleTime,
        }),
      },
    );
    if (!message) throw new Error("Zoho Mail did not return the sent message");
    return message;
  },
};

export default messageSend;
