import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.comment_create` (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10). */
const cardCommentCreated = webhookTrigger({
  key: "card-comment-created",
  title: "Card Comment Created",
  description:
    "Fires when a comment is added to a card. The run gets the action, card id, title and pipe id, the phase, the comment text, the users it mentions, the author and the full payload.",
  action: "card.comment_create",
  sample: {
    action: "card.comment_create",
    cardId: "123456",
    cardTitle: "Prospect 1",
    pipeId: "CxeXHeOR",
    phase: { id: 273, name: "Bad Reviews" },
    fromPhase: null,
    toPhase: null,
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    comment: "I approve this request",
    mentionedUsers: [],
    data: {
      action: "card.comment_create",
      on_phase: { id: 273, name: "Bad Reviews" },
      made_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      comment: "I approve this request",
      mentioned_users: [],
      card: { id: 123456, title: "Prospect 1", pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardCommentCreated;
