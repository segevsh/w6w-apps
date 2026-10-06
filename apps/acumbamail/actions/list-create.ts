import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  name: string;
  sender_email: string;
  company?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
}

/** `POST /api/1/createList/` */
const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  title: "Create List",
  description: "Create a new subscriber list; returns its ID.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "List name",
      type: "string",
      required: true,
    },
    {
      key: "sender_email",
      label: "Sender email",
      type: "string",
      required: true,
      hint: "Address used for list notifications.",
    },
    {
      key: "company",
      label: "Company",
      type: "string",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
    },
    {
      key: "city",
      label: "City",
      type: "string",
    },
    {
      key: "address",
      label: "Address",
      type: "string",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
    },
  ],
  output: [{ key: "id", type: "string", label: "Identifier returned by the vendor" }],

  async execute(input, ctx) {
    const result = await call(ctx, "createList", {
      name: required("name", input.name),
      sender_email: required("sender_email", input.sender_email),
      company: input.company,
      country: input.country,
      city: input.city,
      address: input.address,
      phone: input.phone,
    });
    return { id: result === null || result === undefined ? null : String(result) };
  },
};

export default listCreate;
