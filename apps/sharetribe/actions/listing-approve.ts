import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `POST /v1/integration_api/listings/approve` — approve a listing that is in `pendingApproval`
 * state, setting it to `published`.
 *
 * Not idempotent: the vendor's docs scope this command to a listing "currently in
 * pendingApproval state", and re-running it against an already-published listing is the same
 * shape of vendor-side state precondition as `listing-approve`'s sibling commands (a `409
 * listing-invalid-state` is the documented failure for exactly this pattern elsewhere in the
 * reference), not a same-result no-op.
 */
const listingApprove: ActionDefinition<Input> = {
  key: "listing-approve",
  type: "perform",
  resource: "listing",
  title: "Approve Listing",
  description: "Approve a listing pending operator approval, setting its state to published.",
  idempotent: false,
  params: [idParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/listings/approve", { id: input.id });
  },
};

export default listingApprove;
