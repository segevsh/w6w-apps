import type { ActionDefinition } from "@w6w/types";
import { SierraClient } from "../lib/client.ts";
import {
  listingRequestBody,
  type ListingRequestInput,
  listingRequestParams,
} from "../lib/listing-request.ts";

/** `POST /zapier/requestInfo` — a lead asks for more information about a listing. */
const requestInfo: ActionDefinition<ListingRequestInput> = {
  key: "request-info",
  type: "perform",
  resource: "listing-request",
  title: "Submit Request for Information",
  description: "Record a lead's request for information about a listing.",
  idempotent: false,
  params: listingRequestParams(false),
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    return await new SierraClient(ctx).request(
      "POST",
      "/zapier/requestInfo",
      listingRequestBody(input),
    );
  },
};

export default requestInfo;
