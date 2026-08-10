import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/customers/{id}` — one customer. */
interface Input {
  id: string;
  fields?: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by id.",
  params: [
    idParam("Customer ID", "`customer-list` returns the ids."),
    fieldsParam("customers", "name,email"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/customers/${encodeURIComponent(input.id)}`, {
      query: { "fields[customers]": unset(input.fields) },
    });
  },
};

export default customerGet;
