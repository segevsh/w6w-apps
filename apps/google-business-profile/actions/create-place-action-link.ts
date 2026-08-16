import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, locationName, PLACE_ACTIONS_URL } from "../lib/client.ts";

type PlaceActionType =
  | "APPOINTMENT"
  | "ONLINE_APPOINTMENT"
  | "DINING_RESERVATION"
  | "FOOD_ORDERING"
  | "FOOD_DELIVERY"
  | "FOOD_TAKEOUT"
  | "SHOP_ONLINE"
  | "SOLOPRENEUR_APPOINTMENT";

interface Input {
  locationId: string;
  uri: string;
  placeActionType: PlaceActionType;
  isPreferred?: boolean;
}

/**
 * `locations.placeActionLinks.create` — https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks/create
 *
 * Only one link is allowed per unique (uri, placeActionType, location)
 * combination — calling this twice with the same three values fails with
 * `ALREADY_EXISTS` rather than creating a duplicate — but Google still
 * assigns a fresh server-generated id on every successful call, so this is
 * a create, not an upsert, and is marked non-idempotent accordingly.
 */
const createPlaceActionLink: ActionDefinition<Input> = {
  key: "create-place-action-link",
  type: "perform",
  resource: "place-action-link",
  title: "Create Place Action Link",
  description: "Add a place action link (booking, ordering, reservation URL) to a location.",
  idempotent: false,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    { key: "uri", label: "Link URL", type: "string", required: true },
    {
      key: "placeActionType",
      label: "Action type",
      type: "select",
      required: true,
      options: [
        { value: "APPOINTMENT", label: "Book an appointment" },
        { value: "ONLINE_APPOINTMENT", label: "Book an online appointment" },
        { value: "DINING_RESERVATION", label: "Dining reservation" },
        { value: "FOOD_ORDERING", label: "Order food (delivery and/or takeout)" },
        { value: "FOOD_DELIVERY", label: "Order food delivery" },
        { value: "FOOD_TAKEOUT", label: "Order food takeout" },
        { value: "SHOP_ONLINE", label: "Shop online" },
        { value: "SOLOPRENEUR_APPOINTMENT", label: "Book an appointment (solopreneur partner)" },
      ],
    },
    {
      key: "isPreferred",
      label: "Preferred link",
      type: "boolean",
      default: false,
      hint: "Only one link per action type per location can be preferred.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "uri", type: "string", label: "Link URL" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(
      PLACE_ACTIONS_URL,
      `/${locationName(input.locationId)}/placeActionLinks`,
      {
        method: "POST",
        body: {
          uri: input.uri,
          placeActionType: input.placeActionType,
          isPreferred: input.isPreferred,
        },
      },
    );
  },
};

export default createPlaceActionLink;
