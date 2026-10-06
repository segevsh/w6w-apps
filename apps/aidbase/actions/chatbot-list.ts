import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient } from "../lib/client.ts";

/**
 * List Chatbots — List the chatbots in the account.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const chatbotList: ActionDefinition<Input> = {
  key: "chatbot-list",
  type: "read",
  resource: "chatbot",
  title: "List Chatbots",
  description: "List the chatbots in the account.",
  params: [],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Chatbots",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Number returned",
    },
  ],

  execute(_input, ctx) {
    return new AidbaseClient(ctx).array(`/chatbots`);
  },
};

export default chatbotList;
