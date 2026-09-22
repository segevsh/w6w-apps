import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import {
  detailedRatesParam,
  endDateParam,
  includeSharedRoomsParam,
  propertyIdsParam,
  startDateParam,
} from "../lib/params.ts";

/**
 * `GET /getRatePlans` — the sellable rate plans over a date range.
 *
 * `startDate` and `endDate` are the vendor's own `required` pair: every rate
 * returned is priced for that window, so there is no useful call without them.
 *
 * The response is the flattest in this app: `data` is an array of rate rows
 * keyed by `rateID`/`ratePlanID`, each carrying `roomRate`, `totalRate`,
 * `roomsAvailable`, a `derivedType`/`derivedValue` pair when the rate is
 * derived from a parent, and `roomRateDetailed` when `detailedRates` is on.
 *
 * `includePromoCode` defaults to **true** in the vendor's schema — so promo-coded
 * rate plans are included unless this is explicitly turned off, which is the
 * opposite of most of the other booleans in this API.
 */
interface Input {
  startDate: string;
  endDate: string;
  propertyIDs?: string;
  rateIDs?: string;
  roomTypeID?: string;
  promoCode?: string;
  includePromoCode?: boolean;
  adults?: number;
  children?: number;
  detailedRates?: boolean;
  includeSharedRooms?: boolean;
}

const ratePlanList: ActionDefinition<Input> = {
  key: "rate-plan-list",
  type: "search",
  resource: "rate-plan",
  title: "List Rate Plans",
  description: "List the rate plans for a date range, with their rates and availability.",
  params: [
    { ...startDateParam, required: true },
    { ...endDateParam, required: true },
    propertyIdsParam,
    {
      key: "rateIDs",
      label: "Rate IDs",
      type: "string",
      advanced: true,
      placeholder: "37,345,89",
      hint: "Comma-separated rate IDs to restrict the result to.",
    },
    {
      key: "roomTypeID",
      label: "Room type IDs",
      type: "string",
      advanced: true,
      placeholder: "37,345,89",
      hint: "Comma-separated room type IDs, despite the singular parameter name.",
    },
    {
      key: "promoCode",
      label: "Promo code",
      type: "string",
      advanced: true,
      hint: "Comma-separated promo codes to filter by.",
    },
    {
      key: "includePromoCode",
      label: "Include promo-code plans",
      type: "boolean",
      advanced: true,
      hint: "On by default, matching the API — promo-coded rate plans are returned unless this " +
        "is explicitly turned off.",
    },
    {
      key: "adults",
      label: "Adults",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "children",
      label: "Children",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    detailedRatesParam,
    includeSharedRoomsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Rate plans" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<unknown[]>>("/getRatePlans", {
      query: {
        startDate: input.startDate,
        endDate: input.endDate,
        propertyIDs: input.propertyIDs,
        rateIDs: input.rateIDs,
        roomTypeID: input.roomTypeID,
        promoCode: input.promoCode,
        includePromoCode: input.includePromoCode,
        adults: input.adults,
        children: input.children,
        detailedRates: input.detailedRates,
        includeSharedRooms: input.includeSharedRooms,
      },
    });
  },
};

export default ratePlanList;
