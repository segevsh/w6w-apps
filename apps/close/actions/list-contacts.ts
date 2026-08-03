import type { ActionDefinition } from "@w6w/types";
import {
  CloseClient,
  type CloseList,
  compact,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  leadId?: string;
}

/**
 * `GET /contact/` — offset-paginated list of Contacts.
 *
 * `lead_id` is the one documented filter on this endpoint and it is the common
 * case: "who are the people at this account". Left out, the endpoint walks every
 * Contact in the organization.
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "List Contacts, optionally narrowed to a single Lead. For condition-based filtering across " +
    "contacts, use the Search action.",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      placeholder: "lead_...",
      hint: "Return only the Contacts belonging to this Lead. Omit to list the whole organization.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new CloseClient(ctx).request<CloseList>("/contact/", {
      query: compact({ ...pageQuery(input), lead_id: input.leadId }),
    });
  },
};

export default listContacts;
