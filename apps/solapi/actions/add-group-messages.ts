import type { ActionDefinition } from "@w6w/types";
import { asItems, encodeId, obj, parseJsonParam, SolapiClient } from "../lib/client.ts";

/**
 * Add Messages to Group — Add up to 10,000 messages to a PENDING group per call. Returns a per-message result with the assigned messageId and status code; errorCount above 0 means some messages failed validation.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
  messages: unknown;
}

const addGroupMessages: ActionDefinition<Input> = {
  key: "add-group-messages",
  type: "perform",
  resource: "group",
  title: "Add Messages to Group",
  description:
    "Add up to 10,000 messages to a PENDING group per call. Returns a per-message result with the assigned messageId and status code; errorCount above 0 means some messages failed validation.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "A PENDING group from Create Message Group.",
    },
    {
      "key": "messages",
      "label": "Messages",
      "type": "json",
      "required": true,
      "hint":
        'Array of message objects, at least one: [{"to":"01012345678","from":"029302266","text":"..."}].',
    },
  ],
  output: [
    {
      "key": "errorCount",
      "type": "number",
      "label": "Messages that failed validation (0 means all were added)",
    },
    {
      "key": "resultList",
      "type": "array",
      "label": "Per-message result: to, from, type, messageId, statusCode, statusMessage",
    },
  ],

  async execute(input, ctx) {
    const messages = parseJsonParam(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("SOLAPI: messages must be a non-empty array");
    }
    const body = obj(
      await new SolapiClient(ctx).json(`/messages/v4/groups/${encodeId(input.groupId)}/messages`, {
        method: "PUT",
        body: { messages },
      }),
    );
    const results = asItems(body.resultList);
    return {
      errorCount: typeof body.errorCount === "number" ? body.errorCount : 0,
      resultList: results,
    };
  },
};

export default addGroupMessages;
