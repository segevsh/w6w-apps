import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  siteId: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  code?: string;
  customerId?: number;
}

const siteUpdate: ActionDefinition<Input> = {
  key: "site-update",
  type: "perform",
  resource: "site",
  title: "Update Site",
  description: "Update a site. Only the fields you set are sent.",
  idempotent: true,
  params: [
    idParam("siteId", "Site ID"),
    { key: "name", label: "Name", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zipCode", label: "Zip code", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "Two-letter country abbreviation." },
    {
      key: "code",
      label: "Code",
      type: "string",
      hint: "An alphanumeric code that uniquely identifies the site.",
    },
    optionalIdParam("customerId", "Customer ID", "A site can belong to one customer."),
  ],
  output: [
    { key: "data", type: "object", label: "The updated site" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/sites/${encodeId(input.siteId)}`, {
      method: "PATCH",
      body: compact({
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        country: input.country,
        code: input.code,
        customer_id: input.customerId,
      }),
    });
  },
};

export default siteUpdate;
