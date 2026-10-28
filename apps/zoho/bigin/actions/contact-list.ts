import type { ActionDefinition } from "@w6w/types";
import { type ListInput, listRecords } from "../lib/records.ts";
import { cursorParams, listFields, listOutput, pageParams, sortParams } from "../lib/params.ts";

const DEFAULT_FIELDS = "id,Last_Name,First_Name,Email,Phone,Account_Name,Owner";

const contactList: ActionDefinition<ListInput> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List records in Bigin's Contacts module. `fields` is required by the API (max 50 names).",
  params: [listFields(DEFAULT_FIELDS), ...pageParams, ...sortParams, ...cursorParams],
  output: listOutput,

  execute(input, ctx) {
    return listRecords(ctx, "Contacts", input);
  },
};

export default contactList;
