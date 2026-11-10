import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.done`: a card reaches a finished phase (or a table record is marked done). */
const cardDone = webhookTrigger({
  key: "card-done",
  title: "Card Done",
  description:
    "Fires when a card is moved to a finished phase, or a database table record is marked done. The run gets the action, card id and pipe id, the phase, who finished it and the full payload.",
  action: "card.done",
  sample: {
    action: "card.done",
    cardId: "123456",
    cardTitle: null,
    pipeId: "CxeXHeOR",
    phase: { id: 456, name: "Done" },
    fromPhase: null,
    toPhase: null,
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    data: {
      action: "card.done",
      on_phase: { id: 456, name: "Done" },
      done_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      card: { id: 123456, pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardDone;
