import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceTitanClient } from "../lib/client.ts";

/** `POST /crm/v2/tenant/{tenant}/locations` — requires `name`, `address`, `customerId`. */
interface Input {
  customerId: number;
  name: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const locationCreate: ActionDefinition<Input> = {
  key: "location-create",
  type: "perform",
  resource: "location",
  title: "Create a Location",
  description: "Add a service location to an existing customer.",
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "name", label: "Location name", type: "string", required: true },
    { key: "street", label: "Street", type: "string", required: true },
    { key: "unit", label: "Unit", type: "string" },
    { key: "city", label: "City", type: "string", required: true },
    { key: "state", label: "State", type: "string", required: true },
    { key: "zip", label: "Zip", type: "string", required: true },
    { key: "country", label: "Country", type: "string", required: true, default: "USA" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "customerId", type: "number", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("crm", "/locations", {
      method: "POST",
      body: compact({
        customerId: input.customerId,
        name: input.name,
        address: compact({
          street: input.street,
          unit: input.unit,
          city: input.city,
          state: input.state,
          zip: input.zip,
          country: input.country,
        }),
      }),
    });
  },
};

export default locationCreate;
