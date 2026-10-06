import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/deletecontact.json` — Delete a contact from a list.
 */
interface Input {
  id: string;
  listId: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact from a list.",
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
      label: "List ID",
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
    return await new VboutClient(ctx).post("emailmarketing/deletecontact", {
      id: input.id,
      listid: input.listId,
    });
  },
};

export default contactDelete;
