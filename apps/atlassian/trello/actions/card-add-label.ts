import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  cardId: string;
  labelId: string;
}

/**
 * Adds one label without disturbing the others. `card-update`'s `idLabels`
 * REPLACES the whole set, so prefer this when you only mean to add one.
 */
const cardAddLabel: ActionDefinition<Input, unknown[]> = {
  key: "card-add-label",
  type: "perform",
  resource: "card",
  title: "Add Label to Card",
  description: "Apply an existing label to a card, leaving its other labels intact.",
  // Applying a label already on the card leaves it applied once.
  idempotent: true,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],
  output: [{ key: "", type: "array", label: "Label IDs on the card" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request<unknown[]>(
      `/cards/${encodeURIComponent(input.cardId)}/idLabels`,
      { method: "POST", query: { value: input.labelId } },
    );
  },
};

export default cardAddLabel;
