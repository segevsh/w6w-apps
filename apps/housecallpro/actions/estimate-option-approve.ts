import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /estimates/options/approve` — mark estimate options Pro-approved.
 *
 * The side effect is the part to read before wiring this up: "If company has
 * 'Automatically copy an approved estimate to a new job' turned on, all approved
 * estimate options will be copied to a single job." So on a company with that
 * setting enabled, approving creates a job — and the response says which one, in
 * `copied_on_approval_to_job_id`.
 *
 * Note the path takes no estimate id: options are addressed by their own ids,
 * and several may be approved in one call.
 */
interface Input {
  optionIds: string[] | string;
  companyId?: string;
}

const estimateOptionApprove: ActionDefinition<Input> = {
  key: "estimate-option-approve",
  type: "perform",
  resource: "estimate",
  title: "Approve Estimate Options",
  description:
    "Mark one or more estimate options approved. If the company has 'automatically copy an " +
    "approved estimate to a new job' enabled, this creates a job and returns its id in " +
    "`copied_on_approval_to_job_id`.",
  // Approving an already-approved option leaves it approved. The job copy is
  // driven off the state transition, not off the request.
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
    { key: "copied_on_approval_to_job_id", type: "string", label: "Job created on approval" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json("/estimates/options/approve", {
      method: "POST",
      companyId: input.companyId,
      body: { option_ids: toList(input.optionIds) ?? [] },
    });
  },
};

export default estimateOptionApprove;
