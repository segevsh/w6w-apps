import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  listId: string;
  includeMembershipCount?: "all" | "active";
}

/** `GET /v3/contact_lists/{list_id}` — a single contact list. */
const getContactList: ActionDefinition<Input> = {
  key: "get-contact-list",
  type: "read",
  resource: "list",
  title: "Get Contact List",
  description: "Fetch a single contact list by `list_id`.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "includeMembershipCount",
      label: "Include membership count",
      type: "select",
      hint: "`active` counts mailable contacts only; `all` counts everything.",
      options: [
        { value: "active", label: "Active (mailable) contacts only" },
        { value: "all", label: "All contacts" },
      ],
    },
  ],
  output: [
    { key: "list_id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "membership_count", type: "number", label: "Members" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(`/contact_lists/${encodeURIComponent(input.listId)}`, {
      query: { include_membership_count: input.includeMembershipCount },
    });
  },
};

export default getContactList;
