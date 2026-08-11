import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /estimates/options/decline` — mark estimate options Pro-declined.
 *
 * The mirror of approve, minus the job-copy side effect: the documented response
 * is `{status, last_updated_at}` and nothing else.
 */
interface Input {
  optionIds: string[] | string;
  companyId?: string;
}

const estimateOptionDecline: ActionDefinition<Input> = {
  key: "estimate-option-decline",
  type: "perform",
  resource: "estimate",
  title: "Decline Estimate Options",
  description: "Mark one or more estimate options declined.",
  // Declining an already-declined option leaves it declined.
  idempotent: true,
  params: [
    {
      key: "optionIds",
      label: "Option IDs",
      type: "string",
      required: true,
      hint: "Comma-separated option ids, from Get Estimate's `options` array.",
    },
    companyIdParam,
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "last_updated_at", type: "string", label: "Last updated at" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json("/estimates/options/decline", {
      method: "POST",
      companyId: input.companyId,
      body: { option_ids: toList(input.optionIds) ?? [] },
    });
  },
};

export default estimateOptionDecline;
