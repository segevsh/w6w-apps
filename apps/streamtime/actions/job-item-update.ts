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
 * `PUT /job_items/{job_item_id}` — update a job item.
 *
 * Same writable set as create. `jobId`, `orderId` and every computed total
 * (`totalIncompleteMinutes`, `totalLoggedMinutes`, `jobCurrency*`,
 * `earliestStartDate`, `latestEndDate`, the sub-item counts) are read-only —
 * they are what the scheduling underneath the item adds up to.
 */
interface Input {
  jobItemId: number;
  name?: string;
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

const jobItemUpdate: ActionDefinition<Input> = {
  key: "job-item-update",
  type: "perform",
  resource: "job-item",
  title: "Update Job Item",
  description: "Update a job item's phase, status, description, rates, planned time or dates.",
  idempotent: true,
  params: [
    idParam("jobItemId", "Job Item ID"),
    { key: "name", label: "Name", type: "string" },
    optionalIdParam("jobPhaseId", "Phase ID"),
    modelObjectParam("jobItemStatus", "Status", '{ "id": 1, "name": "In Play" }'),
    { key: "description", label: "Description", type: "text" },
    { key: "sellRate", label: "Sell Rate", type: "number" },
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
    { key: "id", type: "number", label: "Job item ID" },
    { key: "name", type: "string", label: "Item name" },
    { key: "jobItemStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/job_items/${encodeId(input.jobItemId)}`, {
      method: "PUT",
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

export default jobItemUpdate;
