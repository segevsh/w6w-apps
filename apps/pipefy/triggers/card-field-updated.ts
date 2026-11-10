import { webhookTrigger } from "../lib/triggers.ts";

/** Pipefy `card.field_update` (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10). */
const cardFieldUpdated = webhookTrigger({
  key: "card-field-updated",
  title: "Card Field Updated",
  description:
    "Fires when a field of a card or table record is updated. The run gets the action, card id and pipe id, the field that changed, its new value, who changed it and the full payload.",
  action: "card.field_update",
  sample: {
    action: "card.field_update",
    cardId: "123456",
    cardTitle: null,
    pipeId: "CxeXHeOR",
    phase: null,
    fromPhase: null,
    toPhase: null,
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    field: { id: "priority", label: "Priority", internal_id: 123454321 },
    newValue: "High",
    data: {
      action: "card.field_update",
      updated_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      field: { id: "priority", label: "Priority", internal_id: 123454321 },
      new_value: "High",
      card: { id: 123456, pipe_id: "CxeXHeOR" },
    },
  },
});

export default cardFieldUpdated;
