import type { ActionDefinition } from "@w6w/types";
import { compact, LoyverseClient } from "../lib/client.ts";

/** `POST /v1.0/customers` — create, or update when `id` is given. */
interface Input {
  id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  customerCode?: string;
  note?: string;
}

const text = (key: string, label: string, max: number, extra: object = {}) => ({
  key,
  label,
  type: "string" as const,
  validation: { maxLength: max },
  ...extra,
});

const customerSave: ActionDefinition<Input> = {
  key: "customer-save",
  type: "perform",
  resource: "customer",
  title: "Create or Update Customer",
  description: "Create a customer, or update one when an id is given.",
  idempotent: false,
  params: [
    { key: "id", label: "Customer id", type: "string", hint: "Leave empty to create." },
    text("name", "Name", 64, { required: true }),
    text("email", "Email", 100),
    text("phoneNumber", "Phone number", 15),
    text("address", "Address", 192),
    text("city", "City", 64),
    text("region", "Region", 64),
    text("postalCode", "Postal code", 20),
    text("countryCode", "Country code", 2, { hint: "ISO 3166-1 alpha-2." }),
    text("customerCode", "Customer code", 40),
    text("note", "Note", 255),
  ],
  output: [
    { key: "id", type: "string", label: "Customer id" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  async execute(input, ctx) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required");
    return await new LoyverseClient(ctx).json("/customers", {
      method: "POST",
      body: compact({
        id: input.id,
        name: input.name,
        email: input.email,
        phone_number: input.phoneNumber,
        address: input.address,
        city: input.city,
        region: input.region,
        postal_code: input.postalCode,
        country_code: input.countryCode,
        customer_code: input.customerCode,
        note: input.note,
      }),
    });
  },
};

export default customerSave;
