import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import {
  detailedRatesParam,
  endDateParam,
  includeSharedRoomsParam,
  paginationParams,
  propertyIdsParam,
  startDateParam,
} from "../lib/params.ts";

/**
 * `GET /getAvailableRoomTypes` — bookable room types for dates and occupancy.
 *
 * This is the only action in the app whose parameters the vendor marks
 * `required`, and all five of them are: `startDate`, `endDate`, `rooms`,
 * `adults` and `children`. A search without an arrival date, a departure date
 * and an occupancy is not a question Cloudbeds can answer, so that matches the
 * vendor rather than over-constraining the type.
 *
 * `sort`/`order` are the two-value pair from the operation's own enums
 * (`room_name` | `hotel_name` | `room_price` | `hotel_stars`, and `asc` |
 * `desc`). `minRate`/`maxRate` are declared as numbers because the schema says
 * `number` here — unlike `getRoomTypes`' `maxGuests`, which is a string.
 */
interface Input {
  startDate: string;
  endDate: string;
  rooms: number;
  adults: number;
  children: number;
  propertyIDs?: string;
  promoCode?: string;
  detailedRates?: boolean;
  includeSharedRooms?: boolean;
  sort?: string;
  order?: string;
  minRate?: number;
  maxRate?: number;
  pageNumber?: number;
  pageSize?: number;
}

const roomTypeAvailabilityList: ActionDefinition<Input> = {
  key: "room-type-availability-list",
  type: "search",
  resource: "room-type",
  title: "List Available Room Types",
  description: "List the room types available for a date range and occupancy, with their rates.",
  params: [
    { ...startDateParam, required: true },
    { ...endDateParam, required: true },
    {
      key: "rooms",
      label: "Rooms",
      type: "number",
      required: true,
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "Number of rooms to quote for. The vendor's own default is 1.",
    },
    {
      key: "adults",
      label: "Adults",
      type: "number",
      required: true,
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "Number of adults to quote for. The vendor's own default is 1.",
    },
    {
      key: "children",
      label: "Children",
      type: "number",
      required: true,
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Number of children to quote for. Send 0 when there are none — the vendor marks the " +
        "parameter required even at zero.",
    },
    propertyIdsParam,
    {
      key: "promoCode",
      label: "Promo code",
      type: "string",
      advanced: true,
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "room_name", label: "Room name" },
        { value: "hotel_name", label: "Hotel name" },
        { value: "room_price", label: "Room price" },
        { value: "hotel_stars", label: "Hotel stars" },
      ],
    },
    {
      key: "order",
      label: "Sort direction",
      type: "select",
      advanced: true,
      default: "asc",
      options: [
        { value: "asc", label: "Ascending (default)" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "minRate",
      label: "Minimum rate",
      type: "number",
      advanced: true,
      hint: "Filter results to a minimum daily rate.",
    },
    {
      key: "maxRate",
      label: "Maximum rate",
      type: "number",
      advanced: true,
      hint: "Filter results to a maximum daily rate.",
    },
    detailedRatesParam,
    includeSharedRoomsParam,
    ...paginationParams(20),
  ],
  output: [
    { key: "data", type: "array", label: "Available room types" },
    { key: "roomCount", type: "number", label: "Rooms counted" },
    { key: "count", type: "number", label: "Room types in this page" },
    { key: "total", type: "number", label: "Total matching room types" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<unknown[]>>(
      "/getAvailableRoomTypes",
      {
        query: {
          startDate: input.startDate,
          endDate: input.endDate,
          rooms: input.rooms,
          adults: input.adults,
          children: input.children,
          propertyIDs: input.propertyIDs,
          promoCode: input.promoCode,
          detailedRates: input.detailedRates,
          includeSharedRooms: input.includeSharedRooms,
          sort: input.sort,
          order: input.order,
          minRate: input.minRate,
          maxRate: input.maxRate,
          pageNumber: input.pageNumber,
          pageSize: input.pageSize,
        },
      },
    );
  },
};

export default roomTypeAvailabilityList;
