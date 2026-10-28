import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  checklistId: string;
  name: string;
  pos?: string;
  checked?: boolean;
}

const checklistAddItem: ActionDefinition<Input> = {
  key: "checklist-add-item",
  type: "perform",
  resource: "checklist",
  title: "Add Checklist Item",
  description: "Add an item to a checklist.",
  idempotent: false,
  params: [
    { key: "checklistId", label: "Checklist ID", type: "string", required: true },
    { key: "name", label: "Item", type: "string", required: true },
    {
      key: "pos",
      label: "Position",
      type: "string",
      hint: "`top`, `bottom`, or a positive number.",
    },
    { key: "checked", label: "Checked", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "Item" },
    { key: "state", type: "string", label: "State (complete/incomplete)" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/checklists/${encodeURIComponent(input.checklistId)}/checkItems`,
      {
        method: "POST",
        query: { name: input.name, pos: unset(input.pos), checked: input.checked },
      },
    );
  },
};

export default checklistAddItem;
