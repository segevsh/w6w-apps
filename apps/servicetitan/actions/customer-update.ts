import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceTitanClient } from "../lib/client.ts";

/** `PATCH /crm/v2/tenant/{tenant}/customers/{id}` — only the fields supplied are changed. */
interface Input {
  id: number;
  name?: string;
  type?: string;
  active?: boolean;
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  doNotMail?: boolean;
  doNotService?: boolean;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update a Customer",
  description: "Update a customer. Fields left empty are not changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Customer ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Residential", value: "Residential" },
        { label: "Commercial", value: "Commercial" },
      ],
    },
    { key: "active", label: "Active", type: "boolean", hint: "Set false to deactivate." },
    { key: "street", label: "Street", type: "string" },
    { key: "unit", label: "Unit", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zip", label: "Zip", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "doNotMail", label: "Do not mail", type: "boolean", advanced: true },
    { key: "doNotService", label: "Do not service", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request(
      "crm",
      `/customers/${encodeURIComponent(String(input.id))}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          type: input.type,
          active: input.active,
          doNotMail: input.doNotMail,
          doNotService: input.doNotService,
          address: compact({
            street: input.street,
            unit: input.unit,
            city: input.city,
            state: input.state,
            zip: input.zip,
            country: input.country,
          }),
        }),
      },
    );
  },
};

export default customerUpdate;
