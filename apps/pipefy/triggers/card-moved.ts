import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.move`: a card moves from one phase to another. */
const cardMoved = webhookTrigger({
  key: "card-moved",
  title: "Card Moved",
  description:
    "Fires when a card moves to another phase of a pipe. The run gets the action, card id, title and pipe id, the phase it left and the phase it entered, who moved it and the full payload.",
  action: "card.move",
  sample: {
    action: "card.move",
    cardId: "123456",
    cardTitle: "Prospect 1",
    pipeId: "CxeXHeOR",
    phase: null,
    fromPhase: { id: 123, name: "Inbox" },
    toPhase: { id: 345, name: "Doing" },
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    data: {
      action: "card.move",
      from: { id: 123, name: "Inbox" },
      to: { id: 345, name: "Doing" },
      moved_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      card: { id: 123456, title: "Prospect 1", pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardMoved;
