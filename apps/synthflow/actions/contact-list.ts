import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";

interface Input {
  search?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally searching by phone number.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "The contact's phone number." },
  ],
  output: [{ key: "items", type: "array", label: "Contacts" }, {
    key: "pagination",
    type: "object",
    label: "Paging (total, page_size, page_number)",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/contacts", {
      query: { search: input.search },
    });
    return listResult(r, "items");
  },
};

export default contactList;
