import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/movecontact.json` — Move a contact from one list to another.
 */
interface Input {
  id: string;
  listId: string;
  sourceId: string;
}

const contactMove: ActionDefinition<Input> = {
  key: "contact-move",
  type: "perform",
  resource: "contact",
  title: "Move Contact",
  description: "Move a contact from one list to another.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
    },
    {
      key: "listId",
      label: "Destination List ID",
      type: "string",
      required: true,
    },
    {
      key: "sourceId",
      label: "Source List ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "ok",
      type: "boolean",
      label:
        "True when VBOUT accepted the request. Any fields VBOUT returns for the record (e.g. a created record's details) are merged in.",
    },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).post("emailmarketing/movecontact", {
      id: input.id,
      listid: input.listId,
      sourceid: input.sourceId,
    });
  },
};

export default contactMove;
