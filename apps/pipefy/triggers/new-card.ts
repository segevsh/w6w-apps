import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.create`: a card (or database table record) is created. */
const newCard = webhookTrigger({
  key: "new-card",
  title: "New Card",
  description:
    "Fires when a card is created in a pipe, or a record in a database table. The run gets the action, card id and pipe id, the phase it landed in, who created it and the full payload.",
  action: "card.create",
  sample: {
    action: "card.create",
    cardId: "123456",
    cardTitle: null,
    pipeId: "CxeXHeOR",
    phase: { id: 123, name: "Inbox" },
    fromPhase: null,
    toPhase: null,
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    data: {
      action: "card.create",
      on_phase: { id: 123, name: "Inbox" },
      created_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      card: { id: 123456, pipe_id: "CxeXHeOR" },
    },
  },
});

export default newCard;
