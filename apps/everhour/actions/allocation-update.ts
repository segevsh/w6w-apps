import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `PUT /allocations/{allocationId}` — Update a time-off allocation.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  allocationId: number;
  startDate: string;
  endDate: string;
  contractStartDate?: string;
  users: number[] | string;
  timeOffType: number;
  days: number;
  daysCarried?: number;
  accrualFrequency?: string;
  restrictOverAllocation?: boolean;
  completed?: boolean;
  notes?: string;
}

const allocationUpdate: ActionDefinition<Input> = {
  key: "allocation-update",
  type: "perform",
  resource: "allocation",
  title: "Update Time-Off Allocation",
  description: "Update a time-off allocation.",
  idempotent: true,
  params: [
    {
      key: "allocationId",
      label: "Allocation ID",
      type: "number",
      required: true,
      hint: "Numeric time-off allocation id.",
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    { key: "contractStartDate", label: "Contract start date", type: "date" },
    {
      key: "users",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated user ids.",
    },
    { key: "timeOffType", label: "Time-off type ID", type: "number", required: true },
    { key: "days", label: "Days", type: "number", required: true, hint: "Days allocated." },
    { key: "daysCarried", label: "Days carried over", type: "number" },
    {
      key: "accrualFrequency",
      label: "Accrual",
      type: "select",
      options: [{ value: "daily", label: "daily" }, { value: "immediately", label: "immediately" }],
    },
    { key: "restrictOverAllocation", label: "Restrict over-allocation", type: "boolean" },
    { key: "completed", label: "Completed", type: "boolean" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "Allocation ID" },
    { key: "days", type: "number", label: "Days allocated" },
    { key: "daysUsed", type: "number", label: "Days used" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/allocations/${encodeId(input.allocationId)}`, {
      method: "PUT",
      body: compact({
        startDate: input.startDate,
        endDate: input.endDate,
        contractStartDate: input.contractStartDate,
        users: toNumberList(input.users),
        timeOffType: input.timeOffType,
        days: input.days,
        daysCarried: input.daysCarried,
        accrualFrequency: input.accrualFrequency,
        restrictOverAllocation: input.restrictOverAllocation,
        completed: input.completed,
        notes: input.notes,
      }),
    });
  },
};

export default allocationUpdate;
