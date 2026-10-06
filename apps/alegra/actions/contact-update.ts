import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, idPath, jsonObject, stringList } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  identification?: string;
  email?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  mobile?: string;
  types?: string[];
  address?: string;
  city?: string;
  creditLimit?: number;
  status?: string;
  additionalFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Edit a contact. Only the fields you send change.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "identification", label: "Identification", type: "string" },
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
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "JSON object merged into the body.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    const types = stringList(input.types);
    const address = compact({ address: input.address, city: input.city });
    const client = new AlegraClient(ctx);
    return await client.request(`/contacts/${idPath(input.id)}`, {
      method: "PUT",
      body: {
        ...compact({
          name: input.name,
          identification: input.identification,
          email: input.email,
          phonePrimary: input.phonePrimary,
          phoneSecondary: input.phoneSecondary,
          mobile: input.mobile,
          creditLimit: input.creditLimit,
          status: input.status,
        }),
        ...(types.length > 0 ? { type: types } : {}),
        ...(Object.keys(address).length > 0 ? { address } : {}),
        ...jsonObject(input.additionalFields, "additionalFields"),
      },
    });
  },
};

export default contactUpdate;
