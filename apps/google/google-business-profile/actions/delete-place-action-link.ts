import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, PLACE_ACTIONS_URL } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `locations.placeActionLinks.delete` — https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks/delete
 */
const deletePlaceActionLink: ActionDefinition<Input, { success: true }> = {
  key: "delete-place-action-link",
  type: "perform",
  resource: "place-action-link",
  title: "Delete Place Action Link",
  description: "Remove a place action link from a location.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Place action link resource name",
      type: "string",
      required: true,
      hint:
        "locations/{location_id}/placeActionLinks/{place_action_link_id}, as returned by List/Create.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    await client.request<void>(PLACE_ACTIONS_URL, `/${input.name}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deletePlaceActionLink;
