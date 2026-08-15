import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, fieldsParam } from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/text-messages/{conversation_id}.json` — a single
 * text conversation with its full, paginated message history.
 */
interface Input {
  accountId: string;
  conversationId: string;
  fields?: string;
}

const textMessageGet: ActionDefinition<Input> = {
  key: "text-message-get",
  type: "read",
  resource: "text-message",
  title: "Get Text Conversation",
  description: "Fetch a text-message conversation and its message history, newest first.",
  params: [
    accountIdParam,
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      required: true,
      placeholder: "KZaGR",
      hint: "From the `id` of a List Text Conversations or Send Text Message result.",
    },
    { ...fieldsParam, hint: "e.g. lead_status, source." },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "customer_name", type: "string", label: "Customer name" },
    { key: "customer_phone_number", type: "string", label: "Customer phone number" },
    { key: "state", type: "string", label: "active or archived" },
    { key: "messages", type: "array", label: "Every message in the conversation" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/text-messages/${encodeId(input.conversationId)}.json`,
      { query: { fields: input.fields } },
    );
  },
};

export default textMessageGet;
