import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

/**
 * `DELETE /job_phases/{job_phase_id}` — delete a phase, choosing what happens to
 * its contents.
 *
 * The vendor's description: "Job items and logged expenses in the phase are
 * moved to the replacement phase, or left on the job with no phase when none is
 * given." So the destructive behaviour is opt-in and expressed as a query
 * parameter:
 *
 *  - `replacement_job_phase_id` — move the contents to another phase on the same
 *    job;
 *  - `delete_job_items_and_expenses` — delete them instead.
 *
 * The document explicitly says the two cannot be combined, so the action refuses
 * the combination locally rather than sending a request the vendor has already
 * said is invalid.
 */
interface Input {
  jobPhaseId: number;
  replacementJobPhaseId?: number;
  deleteJobItemsAndExpenses?: boolean;
}

const jobPhaseDelete: ActionDefinition<Input, { deleted: boolean }> = {
  key: "job-phase-delete",
  type: "perform",
  resource: "job-phase",
  title: "Delete Job Phase",
  description:
    "Delete a phase. Its job items and logged expenses move to another phase, stay on the job " +
    "with no phase, or are deleted — pick one.",
  // Deleting the same phase twice is the same end state; the second call is a
  // no-op or a 404, not a second deletion.
  idempotent: true,
  params: [
    idParam("jobPhaseId", "Job Phase ID"),
    optionalIdParam(
      "replacementJobPhaseId",
      "Replacement Phase ID",
      "Another phase on the same job to move the items and expenses to.",
    ),
    {
      key: "deleteJobItemsAndExpenses",
      label: "Delete Items and Expenses",
      type: "boolean",
      default: false,
      hint: "Destructive. Cannot be combined with a replacement phase — Streamtime's own rule.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "The phase was deleted" }],

  async execute(input, ctx) {
    if (input.replacementJobPhaseId !== undefined && input.deleteJobItemsAndExpenses === true) {
      throw new Error(
        "replacementJobPhaseId and deleteJobItemsAndExpenses cannot be combined — Streamtime's " +
          "document says the replacement phase and the deletion are alternatives",
      );
    }
    await new StreamtimeClient(ctx).status(`/job_phases/${encodeId(input.jobPhaseId)}`, {
      method: "DELETE",
      query: compact({
        replacement_job_phase_id: input.replacementJobPhaseId,
        delete_job_items_and_expenses: input.deleteJobItemsAndExpenses === true
          ? "true"
          : undefined,
      }),
    });
    return { deleted: true };
  },
};

export default jobPhaseDelete;
