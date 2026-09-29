import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, includeParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  include?: string;
}

/** `GET /v1/integration_api/listings/show` — a listing by ID, in any state. */
const listingGet: ActionDefinition<Input> = {
  key: "listing-get",
  type: "read",
  resource: "listing",
  title: "Get Listing",
  description: "Fetch one listing by ID, regardless of its state (published, closed, etc).",
  params: [idParam, includeParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).show("/listings/show", {
      id: input.id,
      include: input.include,
    });
  },
};

export default listingGet;
