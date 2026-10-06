import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "list",
  title: "Get List Contacts",
  description:
    "Get the contacts saved in a contact list. The response is a DataTables-style envelope (`draw`, `recordsTotal`, `recordsFiltered`, `data`).",
  params: [{ "key": "id", "label": "List ID", "type": "number", "required": true }],
  output: [{ "key": "recordsTotal", "type": "number", "label": "Total contacts" }, {
    "key": "recordsFiltered",
    "type": "number",
    "label": "Filtered contacts",
  }, {
    "key": "data",
    "type": "array",
    "label": "Contacts (id, name, email, linkedin_url, company, job_title)",
  }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", `/api/contacts/get/${seg(input.id)}`);
  },
};

export default listContacts;
