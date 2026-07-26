import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  cardId: string;
  name?: string;
  idChecklistSource?: string;
}

const checklistCreate: ActionDefinition<Input> = {
  key: "checklist-create",
  type: "perform",
  resource: "checklist",
  title: "Create Checklist",
  description: "Add a checklist to a card.",
  idempotent: false,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "Checklist" },
    { key: "idChecklistSource", label: "Copy from checklist ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "checkItems", type: "array", label: "Items" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/cards/${encodeURIComponent(input.cardId)}/checklists`,
      {
        method: "POST",
        query: { name: unset(input.name), idChecklistSource: unset(input.idChecklistSource) },
      },
    );
  },
};

export default checklistCreate;
