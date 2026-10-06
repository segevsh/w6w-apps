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

/** `GET /crm/v2/tenant/{tenant}/locations` — service locations. */
interface Input {
  ids?: string;
  customerId?: number;
  name?: string;
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

const locationList: ActionDefinition<Input> = {
  key: "location-list",
  type: "search",
  resource: "location",
  title: "List Locations",
  description: "List service locations, optionally for one customer.",
  params: [
    idsParam,
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "name", label: "Name", type: "string" },
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
    return await new ServiceTitanClient(ctx).request("crm", "/locations", {
      query: compact({
        ids: idList(input.ids),
        customerId: input.customerId,
        name: input.name,
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

export default locationList;
