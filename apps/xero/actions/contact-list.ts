import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { listFilters, page } from "../lib/params.ts";

interface Input {
  where?: string;
  order?: string;
  page?: number;
  includeArchived?: boolean;
  summaryOnly?: boolean;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts (customers and suppliers) in the organisation.",
  params: [
    ...listFilters,
    page,
    {
      key: "includeArchived",
      label: "Include archived",
      type: "boolean",
      advanced: true,
    },
    {
      key: "summaryOnly",
      label: "Summary only",
      type: "boolean",
      advanced: true,
      hint:
        "Return a lighter payload (no addresses, phones, tax numbers) — much faster for large lists.",
    },
  ],
  output: [{ key: "Contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Contacts", {
      query: {
        where: input.where,
        order: input.order,
        page: input.page ?? 1,
        IncludeArchived: input.includeArchived,
        summaryOnly: input.summaryOnly,
      },
    });
  },
};

export default contactList;
