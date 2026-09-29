import type { ActionDefinition } from "@w6w/types";
import { RedtailClient, unset } from "../lib/client.ts";
import type { RedtailContact } from "../lib/types.ts";

interface Input {
  name?: string;
  firstName?: string;
  lastName?: string;
  type?: string;
  statusId?: number;
  categoryId?: number;
  taxId?: string;
  accountNumber?: string;
  phoneNumber?: string;
  email?: string;
  updatedSince?: string;
}

interface Output {
  contacts: RedtailContact[];
}

/**
 * `GET /contacts/search` — the docs' own parameter description names exactly
 * these fields as "Currently supported search parameters": name, first_name,
 * last_name, type, status_id, category_id, tax_id, account_number,
 * phone_number, email, updated_since.
 */
const contactSearch: ActionDefinition<Input, Output> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by name, type, status, category, tax id, account number, " +
    "phone, email, or last-updated date.",
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "individual", label: "Individual" },
        { value: "business", label: "Business" },
        { value: "trust", label: "Trust" },
        { value: "association", label: "Association" },
      ],
    },
    { key: "statusId", label: "Status ID", type: "number", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    { key: "taxId", label: "Tax ID", type: "string", advanced: true },
    { key: "accountNumber", label: "Account number", type: "string", advanced: true },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      advanced: true,
      hint: "Only return contacts updated on or after this timestamp.",
    },
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/contacts/search", {
      query: {
        name: unset(input.name),
        first_name: unset(input.firstName),
        last_name: unset(input.lastName),
        type: unset(input.type),
        status_id: input.statusId,
        category_id: input.categoryId,
        tax_id: unset(input.taxId),
        account_number: unset(input.accountNumber),
        phone_number: unset(input.phoneNumber),
        email: unset(input.email),
        updated_since: unset(input.updatedSince),
      },
    });
    return { contacts: res.data.contacts ?? [] };
  },
};

export default contactSearch;
