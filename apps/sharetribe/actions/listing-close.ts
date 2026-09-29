import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `POST /v1/integration_api/listings/close` — set a listing's state to `closed`.
 *
 * A closed listing is no longer discoverable via the public Marketplace API's
 * `/listings/query`, but stays reachable by ID and through related resources (e.g. a past
 * transaction). Note that the Integration API's own `listings/query` (this app's `listing-list`)
 * returns closed listings by default.
 */
const listingClose: ActionDefinition<Input> = {
  key: "listing-close",
  type: "perform",
  resource: "listing",
  title: "Close Listing",
  description: "Set a listing's state to closed, removing it from public search.",
  idempotent: true,
  params: [idParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/listings/close", { id: input.id });
  },
};

export default listingClose;
