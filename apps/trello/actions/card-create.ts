import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  idList: string;
  name?: string;
  desc?: string;
  pos?: string;
  due?: string;
  idMembers?: string;
  idLabels?: string;
  urlSource?: string;
  idCardSource?: string;
}

const cardCreate: ActionDefinition<Input> = {
  key: "card-create",
  type: "perform",
  resource: "card",
  title: "Create Card",
  description: "Create a card in a list.",
  idempotent: false,
  params: [
    { key: "idList", label: "List ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "desc", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "pos",
      label: "Position",
      type: "string",
      default: "bottom",
      hint: "`top`, `bottom`, or a positive number.",
    },
    { key: "due", label: "Due", type: "datetime", hint: "ISO 8601 timestamp." },
    {
      key: "idMembers",
      label: "Member IDs",
      type: "string",
      hint: "Comma-separated member ids to assign.",
    },
    {
      key: "idLabels",
      label: "Label IDs",
      type: "string",
      hint: "Comma-separated label ids to apply.",
    },
    {
      key: "urlSource",
      label: "Attachment URL",
      type: "string",
      hint: "URL attached to the new card.",
    },
    { key: "idCardSource", label: "Copy from card ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "shortLink", type: "string", label: "Short link" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request("/cards", {
      method: "POST",
      query: {
        idList: input.idList,
        name: unset(input.name),
        desc: unset(input.desc),
        pos: unset(input.pos),
        due: unset(input.due),
        idMembers: unset(input.idMembers),
        idLabels: unset(input.idLabels),
        urlSource: unset(input.urlSource),
        idCardSource: unset(input.idCardSource),
      },
    });
  },
};

export default cardCreate;
