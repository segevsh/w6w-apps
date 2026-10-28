import type { ActionDefinition } from "@w6w/types";
import { camelKeys, seg, ses } from "../lib/api.ts";

/**
 * ListContacts — `POST /v2/email/contact-lists/{ContactListName}/contacts/list`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListContacts.html
 */
interface Input {
  contactListName: string;
  status?: string;
  pageSize?: number;
  nextToken?: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List the contacts in a contact list, optionally only those opted in or out.",
  params: [
    { key: "contactListName", label: "Contact list", type: "string", required: true },
    {
      key: "status",
      label: "Subscription status",
      type: "select",
      options: [{ value: "OPT_IN", label: "Opted in" }, { value: "OPT_OUT", label: "Opted out" }],
    },
    { key: "pageSize", label: "Page size", type: "number", hint: "Max items per page (1-1000)." },
    {
      key: "nextToken",
      label: "Next token",
      type: "string",
      hint: "Token from a previous call to fetch the next page.",
    },
  ],
  output: [
    {
      key: "contacts",
      type: "array",
      label: "emailAddress, topicPreferences, unsubscribeAll, lastUpdatedTimestamp",
    },
    { key: "nextToken", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  async execute(input, ctx) {
    // ListContacts is a POST with its filter in the body — that is the documented shape.
    const res = await ses<{ Contacts?: unknown[]; NextToken?: string }>(ctx, {
      op: "ListContacts",
      method: "POST",
      path: `/v2/email/contact-lists/${seg(input.contactListName)}/contacts/list`,
      body: {
        Filter: input.status ? { FilteredStatus: input.status } : undefined,
        PageSize: input.pageSize,
        NextToken: input.nextToken || undefined,
      },
    });
    return { contacts: camelKeys(res.Contacts ?? []), nextToken: res.NextToken };
  },
};

export default action;
