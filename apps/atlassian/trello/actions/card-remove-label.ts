import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  cardId: string;
  labelId: string;
}

const cardRemoveLabel: ActionDefinition<Input> = {
  key: "card-remove-label",
  type: "perform",
  resource: "card",
  title: "Remove Label from Card",
  description: "Take one label off a card, leaving its other labels intact.",
  idempotent: true,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],
  output: [{ key: "_value", type: "string", label: "Trello's null result" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/cards/${encodeURIComponent(input.cardId)}/idLabels/${encodeURIComponent(input.labelId)}`,
      { method: "DELETE" },
    );
  },
};

export default cardRemoveLabel;
