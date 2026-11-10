import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.delete` (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10). */
const cardDeleted = webhookTrigger({
  key: "card-deleted",
  title: "Card Deleted",
  description:
    "Fires when a card is deleted from a pipe, or a record from a database table. The run gets the action, card id, title and pipe id, the phase it was in, who deleted it and the full payload.",
  action: "card.delete",
  sample: {
    action: "card.delete",
    cardId: "123456",
    cardTitle: "Prospect 1",
    pipeId: "CxeXHeOR",
    phase: { id: 123, name: "Inbox" },
    fromPhase: null,
    toPhase: null,
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    data: {
      action: "card.delete",
      on_phase: { id: 123, name: "Inbox" },
      deleted_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      card: { id: 123456, title: "Prospect 1", pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardDeleted;
