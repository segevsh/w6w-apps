import type { ActionDefinition } from "@w6w/types";
import { compact, DixaClient, toList } from "../lib/client.ts";
import { requireText } from "../lib/params.ts";

interface Input {
  requesterId: string;
  emailIntegrationId: string;
  subject: string;
  content: string;
  contentFormat?: "Text" | "Html" | "Markdown";
  direction?: "Inbound" | "Outbound";
  agentId?: string;
  language?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  externalId?: string;
}

const FORMATS = ["Text", "Html", "Markdown"];

const conversationCreateEmail: ActionDefinition<Input> = {
  key: "conversation-create-email",
  type: "perform",
  resource: "conversation",
  title: "Create Email Conversation",
  description:
    "Open a new email conversation for an end user. An inbound message is authored by the requester; an outbound one by an agent.",
  idempotent: false,
  params: [
    {
      key: "requesterId",
      label: "End user id",
      type: "string",
      required: true,
      hint: "UUID of the end user the conversation is about.",
    },
    {
      key: "emailIntegrationId",
      label: "Email integration",
      type: "string",
      required: true,
      hint: "The integration address, e.g. my-integration@email.dixa.io.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "content", label: "Message", type: "text", required: true },
    {
      key: "contentFormat",
      label: "Message format",
      type: "select",
      default: "Text",
      options: FORMATS.map((v) => ({ value: v, label: v })),
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "Inbound",
      options: [
        { value: "Inbound", label: "Inbound (from the end user)" },
        { value: "Outbound", label: "Outbound (from an agent)" },
      ],
    },
    {
      key: "agentId",
      label: "Agent id",
      type: "string",
      hint: "Required for an outbound message: the authoring agent's UUID.",
      showIf: { "==": [{ var: "direction" }, "Outbound"] },
    },
    { key: "language", label: "Language", type: "string", hint: "e.g. en." },
    {
      key: "cc",
      label: "Cc (agent/user ids)",
      type: "string",
      hint: "Outbound only. Comma-separated UUIDs.",
    },
    {
      key: "bcc",
      label: "Bcc (agent/user ids)",
      type: "string",
      hint: "Outbound only. Comma-separated UUIDs.",
    },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint: "Your own identifier for the message; Dixa rejects a duplicate.",
    },
  ],
  output: [{ key: "data", type: "object", label: "{ id } — the new conversation's id" }],

  execute(input, ctx) {
    const format = input.contentFormat ?? "Text";
    if (!FORMATS.includes(format)) throw new Error(`contentFormat must be one of ${FORMATS}`);
    const direction = input.direction ?? "Inbound";
    if (direction !== "Inbound" && direction !== "Outbound") {
      throw new Error("direction must be Inbound or Outbound");
    }
    const content = { _type: format, value: requireText(input.content, "content") };
    let message: Record<string, unknown>;
    if (direction === "Outbound") {
      message = {
        _type: "Outbound",
        content,
        agentId: requireText(input.agentId, "agentId (required for an outbound message)"),
        ...compact({
          externalId: input.externalId,
          cc: toList(input.cc),
          bcc: toList(input.bcc),
        }),
      };
    } else {
      message = { _type: "Inbound", content, ...compact({ externalId: input.externalId }) };
    }
    return new DixaClient(ctx).json("/conversations", {
      method: "POST",
      body: {
        _type: "Email",
        requesterId: requireText(input.requesterId, "requesterId"),
        emailIntegrationId: requireText(input.emailIntegrationId, "emailIntegrationId"),
        subject: requireText(input.subject, "subject"),
        message,
        ...compact({ language: input.language }),
      },
    });
  },
};

export default conversationCreateEmail;
