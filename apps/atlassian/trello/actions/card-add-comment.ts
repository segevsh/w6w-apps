import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  cardId: string;
  text: string;
}

const cardAddComment: ActionDefinition<Input> = {
  key: "card-add-comment",
  type: "perform",
  resource: "card",
  title: "Add Comment to Card",
  description: "Post a comment on a card.",
  // Each call appends a distinct comment; a retry double-posts.
  idempotent: false,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    {
      key: "text",
      label: "Comment",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Markdown is supported.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment (action) ID" },
    { key: "data", type: "object", label: "Comment data" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/cards/${encodeURIComponent(input.cardId)}/actions/comments`,
      { method: "POST", query: { text: input.text } },
    );
  },
};

export default cardAddComment;
