import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { paginationParams, propertyIdsParam } from "../lib/params.ts";

/**
 * `GET /getHotels` — the properties this credential can see.
 *
 * The starting point of every workflow that touches more than one property:
 * `propertyID` is what the other operations take, and this is where the ids
 * come from. A single-property credential returns exactly one row.
 *
 * The three filters are documented as partial matches ("Property name, or part
 * of it", "Property city, or part of it"), so they are `string` rather than
 * lookup params.
 *
 * `propertyCurrency` comes back as an array of `{currencyCode,
 * currencySymbol, currencyPosition}` — note the plural, and note that
 * `currencyPosition` says where in a formatted amount the symbol goes, not
 * what the currency is.
 */
interface Input {
  propertyIDs?: string;
  propertyName?: string;
  propertyCity?: string;
  pageNumber?: number;
  pageSize?: number;
}

const hotelList: ActionDefinition<Input> = {
  key: "hotel-list",
  type: "search",
  resource: "hotel",
  title: "List Properties",
  description: "List the Cloudbeds properties this credential can access.",
  params: [
    propertyIdsParam,
    {
      key: "propertyName",
      label: "Property name",
      type: "string",
      advanced: true,
      hint: 'Partial match: Cloudbeds documents this as "property name, or part of it".',
    },
    {
      key: "propertyCity",
      label: "Property city",
      type: "string",
      advanced: true,
      hint: "Partial match, same as the name filter.",
    },
    ...paginationParams(20),
  ],
  output: [
    { key: "data", type: "array", label: "Properties" },
    { key: "count", type: "number", label: "Properties in this page" },
    { key: "total", type: "number", label: "Total matching properties" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<unknown[]>>("/getHotels", {
      query: {
        propertyIDs: input.propertyIDs,
        propertyName: input.propertyName,
        propertyCity: input.propertyCity,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
      },
    });
  },
};

export default hotelList;
