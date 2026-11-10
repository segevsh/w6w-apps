import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.overdue` (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10). */
const cardOverdue = webhookTrigger({
  key: "card-overdue",
  title: "Card Overdue",
  description:
    "Fires when a card passes its due date. The run gets the action, card id and pipe id, the phase and the full payload.",
  action: "card.overdue",
  sample: {
    action: "card.overdue",
    cardId: "123456",
    cardTitle: null,
    pipeId: "CxeXHeOR",
    phase: { id: 123, name: "Phase 123" },
    fromPhase: null,
    toPhase: null,
    user: null,
    data: {
      action: "card.overdue",
      on_phase: { id: 123, name: "Phase 123" },
      card: { id: 123456, pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardOverdue;
