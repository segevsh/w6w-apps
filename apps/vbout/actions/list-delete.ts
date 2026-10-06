import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/deletelist.json` — Delete a contact list.
 */
interface Input {
  id: string;
}

const listDelete: ActionDefinition<Input> = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  title: "Delete Contact List",
  description: "Delete a contact list.",
  idempotent: true,
  params: [
    {
      key: "id",
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
    return await new VboutClient(ctx).post("emailmarketing/deletelist", {
      id: input.id,
    });
  },
};

export default listDelete;
