import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /companies/{company_id}/contacts` — the contacts at one company. */
interface Input {
  companyId: number;
}

const companyContactsList: ActionDefinition<Input> = {
  key: "company-contacts-list",
  type: "search",
  resource: "contact",
  title: "List Company Contacts",
  description: "List the contacts belonging to a company.",
  params: [idParam("companyId", "Company ID")],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const contacts = await new StreamtimeClient(ctx).request<unknown[]>(
      `/companies/${encodeId(input.companyId)}/contacts`,
    );
    return { contacts: contacts ?? [] };
  },
};

export default companyContactsList;
