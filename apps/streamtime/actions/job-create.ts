import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam, optionalIdParam } from "../lib/params.ts";

/**
 * `POST /jobs` — create a job.
 *
 * ## `companyId` is exposed even though the schema marks it read-only
 *
 * The `Job` model carries `companyId` ("The ID of the company this job belongs
 * to") flagged `readOnly: true`, and *every* other field that says which job
 * this is — `jobGroupId`, `isBillable`, `exchangeRate`, the whole set of totals —
 * is read-only too. Sending only the writable fields would leave a job with no
 * company at all, which is not a thing a job can be. The field is in the
 * document's own model; only the annotation is questionable, so it is exposed
 * and the README records the deviation. Nothing else read-only is exposed.
 *
 * The response is the created `Job`, including the id a workflow needs next.
 */
interface Input {
  companyId: number;
  name: string;
  jobStatus?: unknown;
  number?: string;
  purchaseOrderNumber?: string;
  contactId?: number;
  jobLeadUserId?: number;
  rateCardId?: number;
  branchId?: number;
}

const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a job for a company. Returns the new job, including its id.",
  idempotent: false,
  params: [
    idParam("companyId", "Company ID", "The company the job is for. Required by every job."),
    { key: "name", label: "Job Name", type: "string", required: true },
    modelObjectParam("jobStatus", "Status", '{ "id": 1, "name": "In Play" }'),
    { key: "number", label: "Job Number", type: "string", hint: "Left to Streamtime when absent." },
    { key: "purchaseOrderNumber", label: "Purchase Order Number", type: "string" },
    optionalIdParam("contactId", "Contact ID", "The client-side contact for the job."),
    optionalIdParam("jobLeadUserId", "Job Lead User ID"),
    optionalIdParam("rateCardId", "Rate Card ID"),
    optionalIdParam("branchId", "Branch ID"),
  ],
  output: [
    { key: "id", type: "number", label: "New job ID" },
    { key: "name", type: "string", label: "Job name" },
    { key: "fullName", type: "string", label: "Full job name — number plus name" },
    { key: "companyId", type: "number", label: "Company the job belongs to" },
    { key: "jobStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/jobs", {
      method: "POST",
      body: compact({
        companyId: input.companyId,
        name: input.name,
        jobStatus: asOptionalJson(input.jobStatus, "jobStatus"),
        number: input.number,
        purchaseOrderNumber: input.purchaseOrderNumber,
        contactId: input.contactId,
        jobLeadUserId: input.jobLeadUserId,
        rateCardId: input.rateCardId,
        branchId: input.branchId,
      }),
    });
  },
};

export default jobCreate;
