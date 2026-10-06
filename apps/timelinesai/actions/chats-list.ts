import type { ActionDefinition } from "@w6w/types";
import { csv, TimelinesClient } from "../lib/client.ts";

interface Input {
  label?: string;
  whatsappAccountId?: string;
  group?: boolean;
  responsible?: string;
  name?: string;
  phone?: string;
  whatsappPhone?: string;
  read?: boolean;
  closed?: boolean;
  chatgptAutoresponseEnabled?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  withMsg?: boolean;
  page?: number;
}

const chatsList: ActionDefinition<Input> = {
  key: "chats-list",
  type: "search",
  resource: "chat",
  title: "List Chats",
  description:
    "List chats, newest activity first, 50 per page; filters combine with AND (GET /chats).",
  params: [
    {
      "key": "label",
      "label": "Labels",
      "type": "string",
      "hint": "Comma-separated; matches chats with at least one.",
    },
    {
      "key": "whatsappAccountId",
      "label": "WhatsApp account IDs",
      "type": "string",
      "hint": "Comma-separated wids, e.g. 972501111111@s.whatsapp.net.",
    },
    {
      "key": "group",
      "label": "Group chats only",
      "type": "boolean",
      "hint": "true = group chats, false = direct chats, unset = both.",
    },
    {
      "key": "responsible",
      "label": "Responsible (emails)",
      "type": "string",
      "hint": "Comma-separated emails of the assignees.",
    },
    {
      "key": "name",
      "label": "Name contains",
      "type": "string",
      "hint": "Comma-separated; case-insensitive substring match.",
    },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
      "hint": "One phone number; direct chats only. A leading + means exact match.",
    },
    {
      "key": "whatsappPhone",
      "label": "Contact phones",
      "type": "string",
      "hint": "Comma-separated contact numbers, matched against direct chats and group members.",
    },
    {
      "key": "read",
      "label": "Read",
      "type": "boolean",
      "hint": "true = read chats, false = unread, unset = both.",
    },
    {
      "key": "closed",
      "label": "Closed",
      "type": "boolean",
      "hint": "true = closed chats, false = open, unset = both.",
    },
    {
      "key": "chatgptAutoresponseEnabled",
      "label": "ChatGPT auto-response",
      "type": "boolean",
      "hint": "Filter by whether auto-response is enabled.",
    },
    {
      "key": "createdAfter",
      "label": "Created after",
      "type": "string",
      "hint": "Timestamp; can pair with Created before.",
    },
    {
      "key": "createdBefore",
      "label": "Created before",
      "type": "string",
      "hint": "Timestamp; can pair with Created after.",
    },
    {
      "key": "withMsg",
      "label": "Include last message",
      "type": "boolean",
      "hint": "true adds the full last_message object to each chat.",
    },
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "1-based. Keep going while data.has_more_pages is true.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label:
        "has_more_pages and chats[]: id, name, phone, jid, is_group, closed, read, labels, responsible_email, whatsapp_account_id, chat_url \u2026",
    },
  ],

  execute(input, ctx) {
    const q = {
      label: csv(input.label),
      whatsapp_account_id: csv(input.whatsappAccountId),
      group: input.group,
      responsible: csv(input.responsible),
      name: csv(input.name),
      phone: input.phone,
      whatsapp_phone: csv(input.whatsappPhone),
      read: input.read,
      closed: input.closed,
      chatgpt_autoresponse_enabled: input.chatgptAutoresponseEnabled,
      created_after: input.createdAfter,
      created_before: input.createdBefore,
      with_msg: input.withMsg,
      page: input.page,
    };
    return new TimelinesClient(ctx).get("/chats", q);
  },
};

export default chatsList;
