import type { ActionDefinition } from "@w6w/types";
import { encodeId, unwrapList, WorkizClient } from "../lib/client.ts";
import type { Job } from "../lib/schema.ts";

/**
 * `GET /job/get/{UUID}/` — one job by its UUID.
 *
 * This read nests one level deeper than every other in the API: the response is
 * an array whose elements are `{flag, data: <Job>}`, not the job itself (and
 * not the `{flag, data:[…]}` envelope the writes use either). The wrapper is
 * collapsed here.
 *
 * The UUID is the job's unique id — what `lead-convert` returns as the new job
 * and what `job-update`/`job-assign`/`job-add-payment` take.
 */
interface Input {
  uuid: string;
}

const jobGet: ActionDefinition<Input, Job | null> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Read one Workiz job by its UUID.",
  params: [
    {
      key: "uuid",
      label: "Job UUID",
      type: "string",
      required: true,
      hint: "The job's unique id, as returned by List Jobs, Create Job or Convert Lead to Job.",
    },
  ],
  output: [
    { key: "UUID", type: "string", label: "Job UUID" },
    { key: "SerialId", type: "number", label: "Serial id" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "Company", type: "string", label: "Company" },
    { key: "Email", type: "string", label: "Email" },
    { key: "Phone", type: "string", label: "Phone" },
    { key: "Address", type: "string", label: "Address" },
    { key: "City", type: "string", label: "City" },
    { key: "State", type: "string", label: "State" },
    { key: "Status", type: "string", label: "Status" },
    { key: "SubStatus", type: "string", label: "Sub-status" },
    { key: "JobDateTime", type: "string", label: "Scheduled start" },
    { key: "JobEndDateTime", type: "string", label: "Scheduled end" },
    { key: "JobNotes", type: "string", label: "Job notes" },
    { key: "JobTotalPrice", type: "string", label: "Total price" },
    { key: "JobAmountDue", type: "string", label: "Amount due" },
    { key: "SubTotal", type: "string", label: "Subtotal" },
    { key: "Tags", type: "array", label: "Tags" },
    { key: "Team", type: "array", label: "Assigned team" },
    { key: "ClientId", type: "number", label: "Client id" },
    { key: "item_cost", type: "string", label: "Item cost" },
    { key: "tech_cost", type: "string", label: "Technician cost" },
  ],

  async execute(input, ctx) {
    const body = await new WorkizClient(ctx).json(`/job/get/${encodeId(input.uuid)}/`);
    return unwrapList<Job>(body)[0] ?? null;
  },
};

export default jobGet;
