import type { ActionDefinition } from "@w6w/types";
import { csv, HelpScoutClient, unset } from "../lib/client.ts";
import { conversationCreateStatusOptions, conversationTypeOptions } from "../lib/params.ts";

interface Input {
  mailboxId: number;
  subject: string;
  type?: string;
  status?: string;
  customerEmail: string;
  customerFirstName?: string;
  customerLastName?: string;
  initialMessage: string;
  assignTo?: number;
  tags?: string;
  autoReply?: boolean;
  imported?: boolean;
}

/**
 * Creates a conversation with exactly one starting thread — a message from
 * the customer — which is the common case. Help Scout's `threads` array can
 * carry several mixed-type threads in one call (e.g. a customer message plus
 * an internal note); that fuller shape is left out to keep this action's
 * inputs simple, the same trade-off `invoice-create`/`order-create` make in
 * the PayPal app for their multi-line-item shapes.
 */
const createConversation: ActionDefinition<Input> = {
  key: "create-conversation",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation",
  description: "Start a new conversation in an inbox, with a first message from the customer.",
  idempotent: false,
  params: [
    { key: "mailboxId", label: "Inbox ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "email",
      row: "kind",
      options: conversationTypeOptions,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      row: "kind",
      options: conversationCreateStatusOptions,
    },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      required: true,
      row: "customer",
    },
    { key: "customerFirstName", label: "Customer first name", type: "string", row: "customer" },
    { key: "customerLastName", label: "Customer last name", type: "string", row: "customer" },
    {
      key: "initialMessage",
      label: "Message",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "The customer's first message in this conversation.",
    },
    {
      key: "assignTo",
      label: "Assign to (user ID)",
      type: "number",
      advanced: true,
      hint:
        "Leave unset to use the inbox's own assignment rule. There is no way to force it unassigned from here — send Update Conversation's Unassign afterwards.",
    },
    { key: "tags", label: "Tags", type: "string", advanced: true, hint: "Comma-separated." },
    {
      key: "autoReply",
      label: "Send auto-reply",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "imported",
      label: "Imported",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Historical import — suppresses outgoing emails and notifications.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Conversation ID" }],

  async execute(input, ctx) {
    const { resourceId } = await new HelpScoutClient(ctx).create("/conversations", {
      subject: input.subject,
      type: input.type ?? "email",
      status: input.status ?? "active",
      mailboxId: input.mailboxId,
      customer: {
        email: input.customerEmail,
        firstName: unset(input.customerFirstName),
        lastName: unset(input.customerLastName),
      },
      threads: [{
        type: "customer",
        customer: { email: input.customerEmail },
        text: input.initialMessage,
      }],
      assignTo: input.assignTo,
      tags: csv(input.tags),
      autoReply: input.autoReply ?? false,
      imported: input.imported ?? false,
    });
    return { id: resourceId };
  },
};

export default createConversation;
