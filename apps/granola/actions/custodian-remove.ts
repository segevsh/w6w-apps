import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient } from "../lib/client.ts";
import { holdIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/legal-holds/{hold_id}/custodians/{custodian_id}`. The custodian
 * ENTRY id (`lhc_...`, from List Custodians), not the user id. The record of who
 * was held survives (`removed_at`). Not marked idempotent: the vendor documents
 * 404 for an id that was never issued, and does not say what a second removal
 * of the same entry returns.
 */
interface Input {
  holdId: string;
  custodianId: string;
}

const custodianRemove: ActionDefinition<Input> = {
  key: "custodian-remove",
  type: "perform",
  resource: "legal-hold",
  title: "Remove Legal Hold Custodian",
  description: "Remove a custodian entry from a hold. The history is kept with removed_at set.",
  idempotent: false,
  params: [
    holdIdParam,
    {
      key: "custodianId",
      label: "Custodian entry ID",
      type: "string",
      required: true,
      placeholder: "lhc_...",
      hint: "The entry id from List Legal Hold Custodians, not a user id.",
      validation: { pattern: "^lhc_[a-zA-Z0-9]{14}$" },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Custodian entry ID" },
    { key: "removed", type: "boolean", label: "Always true on success" },
    { key: "removed_at", type: "string", label: "Removed at" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request(
      `/legal-holds/${encodeId(input.holdId)}/custodians/${encodeId(input.custodianId)}`,
      { method: "DELETE" },
    );
  },
};

export default custodianRemove;
