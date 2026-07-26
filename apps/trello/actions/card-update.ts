import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  desc?: string;
  idList?: string;
  pos?: string;
  due?: string;
  dueComplete?: boolean;
  closed?: boolean;
  idMembers?: string;
  idLabels?: string;
}

const cardUpdate: ActionDefinition<Input> = {
  key: "card-update",
  type: "perform",
  resource: "card",
  title: "Update Card",
  description: "Update a card. Moving a card between lists is an update with a new List ID.",
  idempotent: true,
  params: [
    { key: "id", label: "Card ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "desc", label: "Description", type: "text", config: { multiline: true } },
    { key: "idList", label: "Move to list ID", type: "string" },
    { key: "pos", label: "Position", type: "string" },
    { key: "due", label: "Due", type: "datetime" },
    { key: "dueComplete", label: "Due complete", type: "boolean" },
    { key: "closed", label: "Archived", type: "boolean" },
    {
      key: "idMembers",
      label: "Member IDs",
      type: "string",
      hint: "Comma-separated. REPLACES the current assignees rather than adding to them.",
    },
    {
      key: "idLabels",
      label: "Label IDs",
      type: "string",
      hint: "Comma-separated. REPLACES the current labels.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "idList", type: "string", label: "List ID" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/cards/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      query: {
        name: unset(input.name),
        desc: unset(input.desc),
        idList: unset(input.idList),
        pos: unset(input.pos),
        due: unset(input.due),
        dueComplete: input.dueComplete,
        closed: input.closed,
        idMembers: unset(input.idMembers),
        idLabels: unset(input.idLabels),
      },
    });
  },
};

export default cardUpdate;
