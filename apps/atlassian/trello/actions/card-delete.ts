import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

/**
 * Permanent. To take a card out of the board reversibly, use `card-update`
 * with Archived instead.
 */
const cardDelete: ActionDefinition<{ id: string }> = {
  key: "card-delete",
  type: "perform",
  resource: "card",
  title: "Delete Card",
  description:
    "Permanently delete a card. Use `card-update` with Archived for a reversible removal.",
  idempotent: true,
  params: [{ key: "id", label: "Card ID", type: "string", required: true }],
  output: [{ key: "_value", type: "string", label: "Trello's null result" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/cards/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default cardDelete;
