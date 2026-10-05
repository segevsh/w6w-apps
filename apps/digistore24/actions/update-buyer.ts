import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  buyer_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  salutation?: "M" | "F";
  title?: string;
  company?: string;
  street_name?: string;
  street_number?: string;
  phone_number?: string;
  city?: string;
  zipcode?: string;
  state?: string;
  country?: string;
}

const updateBuyer: ActionDefinition<Input> = {
  key: "update-buyer",
  type: "perform",
  resource: "buyer",
  title: "Update Buyer",
  description: "Update a buyer's contact details.",
  idempotent: true,
  params: [
    { key: "buyer_id", label: "Buyer ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    {
      key: "salutation",
      label: "Salutation",
      type: "select",
      hint: "M or F.",
      options: [{ value: "M", label: "M" }, { value: "F", label: "F" }],
    },
    { key: "title", label: "Title", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "street_name", label: "Street name", type: "string" },
    { key: "street_number", label: "Street number", type: "string" },
    { key: "phone_number", label: "Phone number", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "zipcode", label: "Postcode", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "Country code, e.g. DE." },
  ],
  output: [
    { key: "is_modified", type: "string", label: "Y if the buyer changed" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "updateBuyer",
      compact({
        buyer_id: input.buyer_id,
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        salutation: input.salutation,
        title: input.title,
        company: input.company,
        street_name: input.street_name,
        street_number: input.street_number,
        phone_number: input.phone_number,
        city: input.city,
        zipcode: input.zipcode,
        state: input.state,
        country: input.country,
      }),
      { write: true },
    );
  },
};

export default updateBuyer;
