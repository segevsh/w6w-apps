import type { ActionDefinition } from "@w6w/types";
import { compact, conversationId, DixaClient, toList } from "../lib/client.ts";
import { conversationIdParam, requireText } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  content: string;
  contentFormat?: "Text" | "Html" | "Markdown";
  direction?: "Inbound" | "Outbound";
  agentId?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  integrationEmail?: string;
  externalId?: string;
}

const FORMATS = ["Text", "Html", "Markdown"];

const messageAdd: ActionDefinition<Input> = {
  key: "message-add",
  type: "perform",
  resource: "message",
  title: "Add Message",
  description:
    "Add a customer-visible message to a conversation. Outbound is an agent reply; inbound is posted as the end user.",
  idempotent: false,
  params: [
    conversationIdParam,
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
      default: "Outbound",
      options: [
        { value: "Outbound", label: "Outbound (agent reply)" },
        { value: "Inbound", label: "Inbound (from the end user)" },
      ],
    },
    {
      key: "agentId",
      label: "Agent id",
      type: "string",
      hint: "Required for an outbound message: the authoring agent's UUID.",
      showIf: { "!=": [{ var: "direction" }, "Inbound"] },
    },
    { key: "cc", label: "Cc (ids)", type: "string", hint: "Outbound only. Comma-separated UUIDs." },
    {
      key: "bcc",
      label: "Bcc (ids)",
      type: "string",
      hint: "Outbound only. Comma-separated UUIDs.",
    },
    {
      key: "integrationEmail",
      label: "Integration email",
      type: "string",
      hint: "For an email conversation: the <address>@email.dixa.io integration to send through.",
    },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint: "Your own identifier for the message.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The added message" }],

  execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const format = input.contentFormat ?? "Text";
    if (!FORMATS.includes(format)) throw new Error(`contentFormat must be one of ${FORMATS}`);
    const direction = input.direction ?? "Outbound";
    if (direction !== "Inbound" && direction !== "Outbound") {
      throw new Error("direction must be Inbound or Outbound");
    }
    const content = { _type: format, value: requireText(input.content, "content") };
    const common = compact({
      integrationEmail: input.integrationEmail,
      externalId: input.externalId,
    });
    const body = direction === "Outbound"
      ? {
        _type: "Outbound",
        content,
        agentId: requireText(input.agentId, "agentId (required for an outbound message)"),
        ...common,
        ...compact({ cc: toList(input.cc), bcc: toList(input.bcc) }),
      }
      : { _type: "Inbound", content, ...common };
    return new DixaClient(ctx).json(`/conversations/${id}/messages`, { method: "POST", body });
  },
};

export default messageAdd;
