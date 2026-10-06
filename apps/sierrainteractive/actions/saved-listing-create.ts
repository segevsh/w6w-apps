import type { ActionDefinition } from "@w6w/types";
import { SierraClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
  mlsNumber: string;
  mlsRegion: string;
}

/** `POST /zapier/savedListings` — body `ListingApiSaveReqModel`. */
const savedListingCreate: ActionDefinition<Input> = {
  key: "saved-listing-create",
  type: "perform",
  resource: "saved-listing",
  title: "Save Listing for Lead",
  description: "Add a listing to a lead's saved listings.",
  idempotent: false,
  params: [
    { key: "leadIdOrEmail", label: "Lead ID or email", type: "string", required: true },
    { key: "mlsNumber", label: "MLS number", type: "string", required: true },
    {
      key: "mlsRegion",
      label: "MLS region",
      type: "string",
      required: true,
      hint: "A name from List MLS Regions.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request("POST", "/zapier/savedListings", {
      leadIdOrEmail: input.leadIdOrEmail,
      mlsNumber: input.mlsNumber,
      mlsRegion: input.mlsRegion,
    });
  },
};

export default savedListingCreate;
