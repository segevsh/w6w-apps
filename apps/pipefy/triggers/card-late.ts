import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.late` (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10). */
const cardLate = webhookTrigger({
  key: "card-late",
  title: "Card Late",
  description:
    "Fires when a card becomes late in its phase (pipes only; Pipefy does not send it for tables). The run gets the action, card id and pipe id, the phase and the full payload.",
  action: "card.late",
  sample: {
    action: "card.late",
    cardId: "123456",
    cardTitle: null,
    pipeId: "CxeXHeOR",
    phase: { id: 123, name: "Phase 123" },
    fromPhase: null,
    toPhase: null,
    user: null,
    data: {
      action: "card.late",
      on_phase: { id: 123, name: "Phase 123" },
      card: { id: 123456, pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardLate;
