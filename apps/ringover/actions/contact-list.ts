import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  search?: string;
  limitCount?: number;
  limitOffset?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List your contacts (yours and those shared with you), optionally searching by first name, last name, company or phone number.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches first name, last name, company and phone numbers, ranked by relevance.",
    },
    limitParam(500),
    offsetParam,
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Contacts in this page" },
    { key: "total", type: "number", label: "Total contacts" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/contacts", {
      query: {
        search: input.search,
        limit_count: input.limitCount,
        limit_offset: input.limitOffset,
      },
    });
    return {
      contacts: listOf(body, "contact_list"),
      count: numberOf(body, "contact_list_count"),
      total: numberOf(body, "total_contact_count"),
    };
  },
};

export default contactList;
