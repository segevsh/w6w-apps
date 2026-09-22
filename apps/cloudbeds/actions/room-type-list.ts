import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import {
  detailedRatesParam,
  endDateParam,
  paginationParams,
  propertyIdsParam,
  startDateParam,
} from "../lib/params.ts";

/**
 * `GET /getRoomTypes` — the room types of one or more properties.
 *
 * `startDate`, `endDate`, `adults` and `children` are **not** marked required
 * by the operation, and the vendor's own descriptions explain why: they are
 * "Required for the rates to be returned". So a call without them is a valid
 * request that returns room types with no rate information — the filters decide
 * whether you get prices or only inventory. They are therefore declared
 * optional here: marking them required would be stricter than the vendor and
 * would make the "just tell me the room types" call impossible.
 *
 * `sort` is the vendor's own `field[:direction]` mini-syntax, semicolon
 * separated, with `sorting_position` as the only documented field. It is a
 * string rather than a `select` because the direction suffix
 * (`sorting_position:desc`) has no single-choice representation.
 *
 * `maxGuests` is a **string** in the vendor's schema, not a number — it is
 * passed through exactly as declared rather than helpfully coerced.
 */
interface Input {
  propertyIDs?: string;
  roomTypeIDs?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  detailedRates?: boolean;
  roomTypeName?: string;
  propertyCity?: string;
  propertyName?: string;
  maxGuests?: string;
  pageNumber?: number;
  pageSize?: number;
  sort?: string;
}

const roomTypeList: ActionDefinition<Input> = {
  key: "room-type-list",
  type: "search",
  resource: "room-type",
  title: "List Room Types",
  description: "List room types, optionally with their rates for a date range and occupancy.",
  params: [
    propertyIdsParam,
    {
      key: "roomTypeIDs",
      label: "Room type IDs",
      type: "string",
      advanced: true,
      placeholder: "37,345,89",
      hint: "Comma-separated room type IDs.",
    },
    {
      ...startDateParam,
      hint: `${startDateParam.hint} Supply it together with the check-out date, adults and ` +
        "children and Cloudbeds also returns each room type's rates — without them you get " +
        "inventory only.",
    },
    {
      ...endDateParam,
      hint: `${endDateParam.hint} Required for rates to be returned.`,
    },
    {
      key: "adults",
      label: "Adults",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Required for rates to be returned.",
    },
    {
      key: "children",
      label: "Children",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Required for rates to be returned.",
    },
    {
      key: "roomTypeName",
      label: "Room type name",
      type: "string",
      advanced: true,
    },
    {
      key: "maxGuests",
      label: "Max guests",
      type: "string",
      advanced: true,
      hint: "The vendor declares this one as a string, so it is sent as one.",
    },
    {
      key: "propertyCity",
      label: "Property city",
      type: "string",
      advanced: true,
    },
    {
      key: "propertyName",
      label: "Property name",
      type: "string",
      advanced: true,
    },
    detailedRatesParam,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      placeholder: "sorting_position:desc",
      hint:
        "The vendor's own `field[:direction]` syntax, semicolon-separated for several fields. " +
        "`sorting_position` is the only documented field; direction is `asc` or `desc`.",
    },
    ...paginationParams(20),
  ],
  output: [
    { key: "data", type: "array", label: "Room types" },
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<unknown[]>>("/getRoomTypes", {
      query: {
        propertyIDs: input.propertyIDs,
        roomTypeIDs: input.roomTypeIDs,
        startDate: input.startDate,
        endDate: input.endDate,
        adults: input.adults,
        children: input.children,
        detailedRates: input.detailedRates,
        roomTypeName: input.roomTypeName,
        propertyCity: input.propertyCity,
        propertyName: input.propertyName,
        maxGuests: input.maxGuests,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize,
        sort: input.sort,
      },
    });
  },
};

export default roomTypeList;
