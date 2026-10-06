import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `POST /allocations` — Allocate time-off days to users.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
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

const allocationCreate: ActionDefinition<Input> = {
  key: "allocation-create",
  type: "perform",
  resource: "allocation",
  title: "Create Time-Off Allocation",
  description: "Allocate time-off days to users.",
  idempotent: false,
  params: [
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
    return new EverhourClient(ctx).one(`/allocations`, {
      method: "POST",
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

export default allocationCreate;
