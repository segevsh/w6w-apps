import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LobClient } from "../lib/client.ts";

interface Input {
  name?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  phone?: string;
  email?: string;
  metadata?: unknown;
}

const addressCreate: ActionDefinition<Input> = {
  key: "address-create",
  type: "perform",
  resource: "address",
  title: "Create Address",
  description:
    "Save an address to the address book. Lob does not deduplicate: creating the same address twice makes two records.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Name or company is required, or both (max 40 characters each).",
    },
    { key: "company", label: "Company", type: "string" },
    { key: "addressLine1", label: "Address line 1", type: "string", required: true },
    { key: "addressLine2", label: "Address line 2", type: "string" },
    { key: "addressCity", label: "City", type: "string", hint: "Required for US addresses." },
    {
      key: "addressState",
      label: "State",
      type: "string",
      hint: "Required for US addresses; 2-letter code.",
    },
    { key: "addressZip", label: "ZIP", type: "string", hint: "Required for US addresses." },
    {
      key: "addressCountry",
      label: "Country (ISO 3166-1 alpha-2)",
      type: "string",
      default: "US",
      hint: "Two-letter code, e.g. US, CA, GB. Non-US addresses need only line 1 and the country.",
    },
    { key: "phone", label: "Phone", type: "string", advanced: true },
    { key: "email", label: "Email", type: "string", advanced: true },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      advanced: true,
      hint: "Up to 20 string key/value pairs.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Address ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address_line1", type: "string", label: "Address line 1" },
    { key: "address_city", type: "string", label: "City" },
    { key: "address_state", type: "string", label: "State" },
    { key: "address_zip", type: "string", label: "ZIP" },
    { key: "address_country", type: "string", label: "Country" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json("/addresses", {
      method: "POST",
      body: compact({
        name: input.name,
        company: input.company,
        address_line1: input.addressLine1,
        address_line2: input.addressLine2,
        address_city: input.addressCity,
        address_state: input.addressState,
        address_zip: input.addressZip,
        address_country: input.addressCountry || "US",
        phone: input.phone,
        email: input.email,
        metadata: asOptionalJson(input.metadata, "Metadata"),
      }),
    });
  },
};

export default addressCreate;
