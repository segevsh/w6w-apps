import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, LexwareClient } from "../lib/client.ts";
import { ACTION_RESULT_OUTPUT } from "../lib/factory.ts";

/**
 * `POST /v1/contacts` — `version: 0`, at least one role (an empty object), and exactly one of
 * `company` (needs `name`) or `person` (needs `lastName`). At most one email per type, one
 * phone per type and one billing address can be written through the API; the form fields cover
 * the common case and `extra` is merged on top for everything else.
 */
interface Input {
  contactType: "person" | "company";
  customer?: boolean;
  vendor?: boolean;
  companyName?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
  note?: string;
  extra?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a customer and/or vendor, as a person or a company.",
  idempotent: false,
  params: [
    {
      key: "contactType",
      label: "Contact type",
      type: "select",
      required: true,
      default: "person",
      options: [{ value: "person", label: "Person" }, { value: "company", label: "Company" }],
    },
    { key: "customer", label: "Customer", type: "boolean", default: true },
    { key: "vendor", label: "Vendor", type: "boolean", default: false },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      showIf: { "==": [{ var: "contactType" }, "company"] },
      hint: "Required for a company.",
    },
    { key: "salutation", label: "Salutation", type: "string", validation: { maxLength: 25 } },
    { key: "firstName", label: "First name", type: "string" },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      hint: "Required for a person; for a company it is the contact person's last name.",
    },
    { key: "email", label: "Email (business)", type: "string" },
    { key: "phone", label: "Phone (business)", type: "string" },
    { key: "street", label: "Billing street", type: "string" },
    { key: "zip", label: "Billing ZIP", type: "string" },
    { key: "city", label: "Billing city", type: "string" },
    {
      key: "countryCode",
      label: "Billing country code",
      type: "string",
      validation: { pattern: "^[A-Za-z]{2}$" },
      hint: "ISO 3166 alpha-2, e.g. DE. Required when any address field is set.",
    },
    { key: "note", label: "Note", type: "text", validation: { maxLength: 1000 } },
    {
      key: "extra",
      label: "Extra fields (JSON)",
      type: "json",
      hint: "Merged over the body, top-level key by key (e.g. xRechnung, addresses.shipping).",
    },
  ],
  output: ACTION_RESULT_OUTPUT,
  async execute(input, ctx) {
    if (input.customer !== true && input.vendor !== true) {
      throw new Error("A contact needs at least one role: set Customer and/or Vendor");
    }
    const roles: Record<string, unknown> = {};
    if (input.customer === true) roles.customer = {};
    if (input.vendor === true) roles.vendor = {};

    const body: Record<string, unknown> = { version: 0, roles };
    const hasName = String(input.lastName ?? "").trim() !== "";
    if (input.contactType === "company") {
      if (!String(input.companyName ?? "").trim()) throw new Error("Company name is required");
      body.company = compact({
        name: input.companyName,
        contactPersons: hasName
          ? [compact({
            salutation: input.salutation,
            firstName: input.firstName,
            lastName: input.lastName,
            emailAddress: input.email,
            phoneNumber: input.phone,
          })]
          : undefined,
      });
    } else {
      if (!hasName) throw new Error("Last name is required for a person");
      body.person = compact({
        salutation: input.salutation,
        firstName: input.firstName,
        lastName: input.lastName,
      });
    }
    if (input.street || input.zip || input.city || input.countryCode) {
      if (!input.countryCode) throw new Error("Billing country code is required with an address");
      body.addresses = {
        billing: [compact({
          street: input.street,
          zip: input.zip,
          city: input.city,
          countryCode: String(input.countryCode).toUpperCase(),
        })],
      };
    }
    if (input.email) body.emailAddresses = { business: [input.email] };
    if (input.phone) body.phoneNumbers = { business: [input.phone] };
    if (input.note) body.note = input.note;
    if (input.extra !== undefined && input.extra !== null && input.extra !== "") {
      Object.assign(body, asObject(input.extra, "Extra fields"));
    }
    return await new LexwareClient(ctx).json("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
