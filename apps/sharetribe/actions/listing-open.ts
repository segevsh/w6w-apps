import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `POST /v1/integration_api/listings/open` — set a closed listing's state to `published`. */
const listingOpen: ActionDefinition<Input> = {
  key: "listing-open",
  type: "perform",
  resource: "listing",
  title: "Open Listing",
  description: "Re-open a closed listing, setting its state back to published.",
  idempotent: true,
  params: [idParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/listings/open", { id: input.id });
  },
};

export default listingOpen;
