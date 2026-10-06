import type { ActionDefinition } from "@w6w/types";
import { SierraClient } from "../lib/client.ts";
import {
  listingRequestBody,
  type ListingRequestInput,
  listingRequestParams,
} from "../lib/listing-request.ts";

/** `POST /zapier/scheduleShowing` — a lead asks to see a listing. */
const scheduleShowing: ActionDefinition<ListingRequestInput> = {
  key: "schedule-showing",
  type: "perform",
  resource: "listing-request",
  title: "Submit Showing Request",
  description: "Record a lead's request to schedule a showing of a listing.",
  idempotent: false,
  params: listingRequestParams(true),
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "POST",
      "/zapier/scheduleShowing",
      listingRequestBody(input),
    );
  },
};

export default scheduleShowing;
