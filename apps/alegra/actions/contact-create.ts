import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, jsonObject, stringList } from "../lib/client.ts";

interface Input {
  name: string;
  identification?: string;
  email?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  mobile?: string;
  types?: string[];
  address?: string;
  city?: string;
  creditLimit?: number;
  ignoreRepeated?: boolean;
  additionalFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact (client, provider or both).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "identification", label: "Identification", type: "string", hint: "Tax / national id." },
    { key: "email", label: "Email", type: "string" },
    { key: "phonePrimary", label: "Phone", type: "string" },
    { key: "phoneSecondary", label: "Phone 2", type: "string" },
    { key: "mobile", label: "Mobile", type: "string" },
    {
      key: "types",
      label: "Types",
      type: "multiselect",
      options: [{ value: "client", label: "Client" }, { value: "provider", label: "Provider" }],
    },
    { key: "address", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "creditLimit", label: "Credit limit", type: "number" },
    {
      key: "ignoreRepeated",
      label: "Ignore repeated identification",
      type: "boolean",
      hint: "Create the contact even if another has the same identification number.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object merged into the body (giro, seller, priceList, term, internalContacts, …).",
    },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    const types = stringList(input.types);
    const address = compact({ address: input.address, city: input.city });
    const client = new AlegraClient(ctx);
    return await client.request("/contacts", {
      method: "POST",
      body: {
        ...compact({
          name: input.name,
          identification: input.identification,
          email: input.email,
          phonePrimary: input.phonePrimary,
          phoneSecondary: input.phoneSecondary,
          mobile: input.mobile,
          creditLimit: input.creditLimit,
          ignoreRepeated: input.ignoreRepeated,
        }),
        ...(types.length > 0 ? { type: types } : {}),
        ...(Object.keys(address).length > 0 ? { address } : {}),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default contactCreate;
