import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  cardId: string;
  checkItemId: string;
  name?: string;
  state?: string;
  pos?: string;
}

/**
 * Updating an item goes through the **card**, not the checklist:
 * `PUT /cards/{cardId}/checkItem/{checkItemId}`. That asymmetry is Trello's,
 * not ours — creating an item uses the checklist route.
 */
const checklistUpdateItem: ActionDefinition<Input> = {
  key: "checklist-update-item",
  type: "perform",
  resource: "checklist",
  title: "Update Checklist Item",
  description: "Rename, reposition or tick off a checklist item.",
  idempotent: true,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "checkItemId", label: "Item ID", type: "string", required: true },
    { key: "name", label: "Item", type: "string" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "complete", label: "Complete" },
        { value: "incomplete", label: "Incomplete" },
      ],
    },
    { key: "pos", label: "Position", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/cards/${encodeURIComponent(input.cardId)}/checkItem/${
        encodeURIComponent(input.checkItemId)
      }`,
      {
        method: "PUT",
        query: { name: unset(input.name), state: unset(input.state), pos: unset(input.pos) },
      },
    );
  },
};

export default checklistUpdateItem;
