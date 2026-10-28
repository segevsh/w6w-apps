import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, locationName, PLACE_ACTIONS_URL } from "../lib/client.ts";

interface Input {
  locationId: string;
  placeActionType?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `locations.placeActionLinks.list` — https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks/list
 *
 * Place action links are the booking/ordering/reservation URLs (e.g. "Order
 * food", "Book online") that can appear on a location's Business Profile.
 */
const listPlaceActionLinks: ActionDefinition<Input> = {
  key: "list-place-action-links",
  type: "read",
  resource: "place-action-link",
  title: "List Place Action Links",
  description: "List the place action links (booking, ordering, reservation URLs) on a location.",
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    {
      key: "placeActionType",
      label: "Filter by action type",
      type: "string",
      hint:
        "e.g. APPOINTMENT, ONLINE_APPOINTMENT, DINING_RESERVATION, FOOD_ORDERING, FOOD_DELIVERY, FOOD_TAKEOUT, SHOP_ONLINE.",
    },
    { key: "pageSize", label: "Page size", type: "number", default: 10 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "placeActionLinks", type: "array", label: "Place action links" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(
      PLACE_ACTIONS_URL,
      `/${locationName(input.locationId)}/placeActionLinks`,
      {
        query: {
          filter: input.placeActionType ? `place_action_type=${input.placeActionType}` : undefined,
          pageSize: input.pageSize ?? 10,
          pageToken: input.pageToken,
        },
      },
    );
  },
};

export default listPlaceActionLinks;
