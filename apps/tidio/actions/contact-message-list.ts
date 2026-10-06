import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput, str } from "../lib/params.ts";

/** `GET /contacts/{contactId}/messages`. */
type Input = { contact_id: string; cursor?: string };

const contactMessageList: ActionDefinition<Input> = {
  key: "contact-message-list",
  type: "read",
  resource: "contact",
  title: "List Contact Messages",
  description:
    "List the chat conversation with a contact: messages from the contact, operators and bots.",
  params: [str("contact_id", "Contact ID", { required: true }), cursorParam],
  output: [
    ...listOutput("Messages [{id, author_type, author_id, message, created_at}]"),
    { key: "conversation_url", type: "string", label: "Link to the conversation in Tidio" },
  ],
  async execute(input, ctx) {
    const body = await call(ctx, "GET", `/contacts/${encodeId(input.contact_id)}/messages`, {
      query: pick(input, ["cursor"]) as never,
    });
    const url = (body as { conversation_url?: unknown } | null)?.conversation_url;
    return listResult(body, "messages", (x) => x, {
      conversation_url: typeof url === "string" ? url : null,
    });
  },
};

export default contactMessageList;
