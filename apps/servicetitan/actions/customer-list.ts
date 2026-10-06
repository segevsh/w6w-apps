import type { ActionDefinition } from "@w6w/types";
import { compact, idList, ServiceTitanClient } from "../lib/client.ts";
import {
  activeParam,
  createdParam,
  idsParam,
  listOutput,
  modifiedParam,
  pagingParams,
  pagingQuery,
} from "../lib/params.ts";

/** `GET /crm/v2/tenant/{tenant}/customers` — customers, 50 per page by default. */
interface Input {
  ids?: string;
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  active?: string;
  createdOnOrAfter?: string;
  modifiedOnOrAfter?: string;
  page?: number;
  pageSize?: number;
  includeTotal?: boolean;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List or search the tenant's customers by name, phone, address or modified date.",
  params: [
    idsParam,
    { key: "name", label: "Name", type: "string" },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Matches the phone number of a contact.",
    },
    { key: "street", label: "Street", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zip", label: "Zip", type: "string" },
    activeParam,
    createdParam,
    modifiedParam,
    ...pagingParams,
  ],
  output: listOutput,

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request("crm", "/customers", {
      query: compact({
        ids: idList(input.ids),
        name: input.name,
        phone: input.phone,
        street: input.street,
        city: input.city,
        state: input.state,
        zip: input.zip,
        active: input.active,
        createdOnOrAfter: input.createdOnOrAfter,
        modifiedOnOrAfter: input.modifiedOnOrAfter,
        ...pagingQuery(input),
      }),
    });
  },
};

export default customerList;
