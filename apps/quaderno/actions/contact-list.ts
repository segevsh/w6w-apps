import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/common.ts";

interface Input {
  q?: string;
  processorId?: string;
  limit?: number;
  createdBefore?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, newest first. Optionally filter by name, email or tax ID.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches the contact's full name, email or tax ID. Case-sensitive.",
    },
    { key: "processorId", label: "Processor ID", type: "string" },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new QuadernoClient(ctx).list("/contacts", {
      q: input.q,
      processor_id: input.processorId,
      limit: input.limit,
      created_before: input.createdBefore,
    });
  },
};

export default contactList;
