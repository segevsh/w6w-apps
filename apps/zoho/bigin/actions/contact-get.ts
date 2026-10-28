import type { ActionDefinition } from "@w6w/types";
import { type GetInput, getRecord } from "../lib/records.ts";
import { optionalFields, recordId } from "../lib/params.ts";

const contactGet: ActionDefinition<GetInput> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one Contact record by id from Bigin's Contacts module.",
  params: [recordId, optionalFields],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "Owner", type: "object", label: "Record owner" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, "Contacts", input);
  },
};

export default contactGet;
