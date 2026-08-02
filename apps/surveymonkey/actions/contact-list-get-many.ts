import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
}

/** GET /contact_lists — list the address book's contact lists. */
const contactListGetMany: ActionDefinition<Input> = {
  key: "contact-list-get-many",
  type: "read",
  resource: "contact-list",
  title: "Get Many Contact Lists",
  description: "List the contact lists in the account's address book.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "1-based page number. Default 1." },
    { key: "perPage", label: "Page size", type: "number" },
  ],
  output: [
    { key: "data", type: "array", label: "Contact lists" },
    { key: "total", type: "number", label: "Total items" },
    { key: "page", type: "number", label: "Current page" },
    { key: "per_page", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request("/contact_lists", {
      query: { page: input.page, per_page: input.perPage },
    });
  },
};

export default contactListGetMany;
