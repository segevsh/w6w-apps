import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  email?: string;
  phone?: string;
  mobile?: string;
  companyId?: number;
  page?: number;
  perPage?: number;
}

const contactGetMany: ActionDefinition<Input> = {
  key: "contact-get-many",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts. Use the filters to narrow the set.",
  params: [
    { key: "email", label: "Email", type: "string", row: "filter" },
    { key: "phone", label: "Phone", type: "string", row: "filter" },
    { key: "mobile", label: "Mobile", type: "string", row: "filter" },
    { key: "companyId", label: "Company ID", type: "number" },
    ...pagination,
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const contacts = await new FreshdeskClient(ctx).request("/contacts", {
      query: {
        email: unset(input.email),
        phone: unset(input.phone),
        mobile: unset(input.mobile),
        company_id: input.companyId,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { contacts };
  },
};

export default contactGetMany;
