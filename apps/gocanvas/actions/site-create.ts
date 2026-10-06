import type { ActionDefinition } from "@w6w/types";
import { compact, GoCanvasClient } from "../lib/client.ts";
import { optionalIdParam } from "../lib/params.ts";

interface Input {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  code?: string;
  customerId?: number;
}

const siteCreate: ActionDefinition<Input> = {
  key: "site-create",
  type: "perform",
  resource: "site",
  title: "Create Site",
  description: "Create a site (a physical location where work is done). Only the name is required.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
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
    { key: "data", type: "object", label: "The created site" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request("/sites", {
      method: "POST",
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

export default siteCreate;
