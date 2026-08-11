import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /leads/{id}/convert` — turn a lead into a job or an estimate.
 *
 * The response carries exactly one of two keys and the reference says so:
 * `job_id` "Present only if the lead was converted to a job", `estimate_id`
 * "Present only if the lead was converted to an estimate". Both are declared as
 * outputs; one will be absent on any given run.
 */
interface Input {
  leadId: string;
  type: string;
  companyId?: string;
}

const leadConvert: ActionDefinition<Input> = {
  key: "lead-convert",
  type: "perform",
  resource: "lead",
  title: "Convert Lead",
  description:
    "Convert a lead into a job or an estimate. The response carries `job_id` or `estimate_id` " +
    "depending on which was asked for.",
  // Conversion creates a new job or estimate; a retry creates a second one.
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    {
      key: "type",
      label: "Convert to",
      type: "select",
      required: true,
      options: [
        { value: "job", label: "Job" },
        { value: "estimate", label: "Estimate" },
      ],
    },
    companyIdParam,
  ],
  output: [
    { key: "job_id", type: "string", label: "Job ID (when converted to a job)" },
    { key: "estimate_id", type: "string", label: "Estimate ID (when converted to an estimate)" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/leads/${encodeId(input.leadId)}/convert`, {
      method: "POST",
      companyId: input.companyId,
      body: { type: input.type },
    });
  },
};

export default leadConvert;
