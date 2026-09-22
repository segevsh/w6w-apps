import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import {
  asOptionalJson,
  dateParam,
  idParam,
  modelObjectParam,
  optionalIdParam,
} from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/job_items` — add a job item.
 *
 * The three nested objects here are Streamtime's configuring lookups, and this
 * action passes them through as JSON because their names are per-organisation:
 *
 *  - `jobItemStatus` — `{ id, name }`;
 *  - `costingMethod` — `{ id, name }`;
 *  - `timeAllocationMethod` — `{ id, name }`. This one decides where planned
 *    time lives: allocated **by person** it is stored per job item user, while
 *    "Time By Item" pools it at item level and reports 0 per user. Which one an
 *    item uses changes what the scheduling actions can write — see
 *    `job-item-user-create`.
 */
interface Input {
  jobId: number;
  name: string;
  jobPhaseId?: number;
  jobItemStatus?: unknown;
  description?: string;
  sellRate?: number;
  costingMethod?: unknown;
  isBillable?: boolean;
  timeAllocationMethod?: unknown;
  totalPlannedMinutes?: number;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  completedDate?: string;
}

const jobItemCreate: ActionDefinition<Input> = {
  key: "job-item-create",
  type: "perform",
  resource: "job-item",
  title: "Create Job Item",
  description:
    "Create a job item on a job, optionally in a phase, with its status, rates and planned time.",
  idempotent: false,
  params: [
    idParam("jobId", "Job ID"),
    { key: "name", label: "Name", type: "string", required: true, placeholder: "UI Design" },
    optionalIdParam("jobPhaseId", "Phase ID", "Omit to leave the item on the job with no phase."),
    modelObjectParam("jobItemStatus", "Status", '{ "id": 1, "name": "In Play" }'),
    { key: "description", label: "Description", type: "text" },
    { key: "sellRate", label: "Sell Rate", type: "number", hint: "In job currency, per hour." },
    modelObjectParam("costingMethod", "Costing Method", '{ "id": 1, "name": "Fixed Fee" }'),
    { key: "isBillable", label: "Billable", type: "boolean" },
    modelObjectParam(
      "timeAllocationMethod",
      "Time Allocation Method",
      '{ "id": 1, "name": "Time By Person" }',
    ),
    {
      key: "totalPlannedMinutes",
      label: "Total Planned Minutes",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    dateParam("estimatedStartDate", "Estimated Start Date"),
    dateParam("estimatedEndDate", "Estimated End Date"),
    dateParam("completedDate", "Completed Date"),
  ],
  output: [
    { key: "id", type: "number", label: "New job item ID" },
    { key: "name", type: "string", label: "Item name" },
    { key: "jobId", type: "number", label: "Job ID" },
    { key: "jobPhaseId", type: "number", label: "Phase ID" },
    { key: "jobItemStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/jobs/${encodeId(input.jobId)}/job_items`, {
      method: "POST",
      body: compact({
        name: input.name,
        jobPhaseId: input.jobPhaseId,
        jobItemStatus: asOptionalJson(input.jobItemStatus, "jobItemStatus"),
        description: input.description,
        sellRate: input.sellRate,
        costingMethod: asOptionalJson(input.costingMethod, "costingMethod"),
        isBillable: input.isBillable,
        timeAllocationMethod: asOptionalJson(input.timeAllocationMethod, "timeAllocationMethod"),
        totalPlannedMinutes: input.totalPlannedMinutes,
        estimatedStartDate: input.estimatedStartDate,
        estimatedEndDate: input.estimatedEndDate,
        completedDate: input.completedDate,
      }),
    });
  },
};

export default jobItemCreate;
