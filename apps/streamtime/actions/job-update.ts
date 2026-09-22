import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam, optionalIdParam } from "../lib/params.ts";

/**
 * `PUT /jobs/{job_id}` — update the writable half of a job.
 *
 * The `Job` schema marks the whole financial side read-only: budget, exchange
 * rate, planned/logged/invoiced totals and the timestamps are all computed by
 * Streamtime. Only the descriptive fields and the assignments are writable, and
 * `companyId` is exposed here on the same reasoning as in `job-create` — a job
 * that moved between companies could not otherwise be corrected.
 *
 * Status changes have their own route (`job-status-update`), because Streamtime
 * validates them against active/archived limits; use that one when the intent is
 * a status transition.
 */
interface Input {
  jobId: number;
  name?: string;
  jobStatus?: unknown;
  number?: string;
  purchaseOrderNumber?: string;
  contactId?: number;
  jobLeadUserId?: number;
  rateCardId?: number;
  branchId?: number;
  companyId?: number;
}

const jobUpdate: ActionDefinition<Input> = {
  key: "job-update",
  type: "perform",
  resource: "job",
  title: "Update Job",
  description:
    "Update a job's name, number, status, lead, contact, rate card or branch. Financial fields " +
    "are read-only; use Update Job Status for a status transition.",
  idempotent: true,
  params: [
    idParam("jobId", "Job ID"),
    { key: "name", label: "Job Name", type: "string" },
    modelObjectParam("jobStatus", "Status", '{ "id": 1, "name": "In Play" }'),
    { key: "number", label: "Job Number", type: "string" },
    { key: "purchaseOrderNumber", label: "Purchase Order Number", type: "string" },
    optionalIdParam("contactId", "Contact ID"),
    optionalIdParam("jobLeadUserId", "Job Lead User ID"),
    optionalIdParam("rateCardId", "Rate Card ID"),
    optionalIdParam("branchId", "Branch ID"),
    optionalIdParam("companyId", "Company ID", "See the note above; read-only in the schema."),
  ],
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Job name" },
    { key: "jobStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        jobStatus: asOptionalJson(input.jobStatus, "jobStatus"),
        number: input.number,
        purchaseOrderNumber: input.purchaseOrderNumber,
        contactId: input.contactId,
        jobLeadUserId: input.jobLeadUserId,
        rateCardId: input.rateCardId,
        branchId: input.branchId,
        companyId: input.companyId,
      }),
    });
  },
};

export default jobUpdate;
