import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient, unset } from "../lib/client.ts";
import { conversationStatusOptions, pagination } from "../lib/params.ts";

interface Input {
  mailboxId?: number;
  status?: string;
  tag?: string;
  assignedTo?: number;
  modifiedSince?: string;
  number?: number;
  sortField?: string;
  sortOrder?: string;
  page?: number;
}

const listConversations: ActionDefinition<Input> = {
  key: "list-conversations",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "List and filter conversations. Defaults to active conversations, newest first.",
  params: [
    { key: "mailboxId", label: "Inbox ID", type: "number", row: "filter" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      row: "filter",
      options: conversationStatusOptions,
    },
    { key: "tag", label: "Tag", type: "string", row: "filter" },
    { key: "assignedTo", label: "Assignee ID", type: "number", advanced: true },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      advanced: true,
      hint: "Only conversations modified on or after this time.",
    },
    { key: "number", label: "Conversation number", type: "number", advanced: true },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      default: "createdAt",
      row: "sort",
      advanced: true,
      options: [
        { value: "createdAt", label: "Created" },
        { value: "customerEmail", label: "Customer email" },
        { value: "customerName", label: "Customer name" },
        { value: "modifiedAt", label: "Modified" },
        { value: "number", label: "Number" },
        { value: "score", label: "Score" },
        { value: "status", label: "Status" },
        { value: "subject", label: "Subject" },
        { value: "waitingSince", label: "Waiting since" },
      ],
    },
    {
      key: "sortOrder",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      advanced: true,
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "conversations", type: "array", label: "Conversations" }],

  async execute(input, ctx) {
    const body = await new HelpScoutClient(ctx).request<
      { _embedded?: { conversations?: unknown } }
    >(
      "/conversations",
      {
        query: {
          mailbox: input.mailboxId,
          status: unset(input.status),
          tag: unset(input.tag),
          assigned_to: input.assignedTo,
          modifiedSince: unset(input.modifiedSince),
          number: input.number,
          sortField: unset(input.sortField),
          sortOrder: unset(input.sortOrder),
          page: input.page,
        },
      },
    );
    return { conversations: body._embedded?.conversations ?? [] };
  },
};

export default listConversations;
