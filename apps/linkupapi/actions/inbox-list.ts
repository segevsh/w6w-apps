import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
  category?: string;
  cursor?: string;
  salesNav?: boolean;
  unreadOnly?: boolean;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
  ["category", "category", "s"],
  ["cursor", "cursor", "s"],
  ["salesNav", "sales_nav", "b"],
  ["unreadOnly", "unread_only", "b"],
];

const inboxList: ActionDefinition<Input, ActionResult> = {
  key: "inbox-list",
  type: "read",
  resource: "messages",
  title: "List Inbox",
  description: "List conversations in the account's inbox.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of conversations to return (default 10).",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { "value": "INBOX", "label": "INBOX" },
        { "value": "UNREAD", "label": "UNREAD" },
        { "value": "MY_CONNECTIONS", "label": "MY_CONNECTIONS" },
        { "value": "INMAIL", "label": "INMAIL" },
        { "value": "STARRED", "label": "STARRED" },
      ],
      default: "INBOX",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The cursor from the previous response's next_cursor; omit for the first page.",
    },
    {
      key: "salesNav",
      label: "Sales Navigator",
      type: "boolean",
      hint: "Use the Sales Navigator seat of the account (it must hold one).",
    },
    {
      key: "unreadOnly",
      label: "Unread only",
      type: "boolean",
      hint: "Email accounts: only unread emails.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "messages",
      "list_inbox",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default inboxList;
