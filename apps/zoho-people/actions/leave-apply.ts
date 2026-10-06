import type { ActionDefinition } from "@w6w/types";
import { jsonObject } from "../lib/client.ts";
import { API, peopleCall } from "../lib/people.ts";

interface Input {
  employeeId: string;
  leaveTypeId: string;
  from: string;
  to: string;
  days?: unknown;
  extraFields?: unknown;
}

const leaveApply: ActionDefinition<Input> = {
  key: "leave-apply",
  type: "perform",
  resource: "leave",
  title: "Apply Leave",
  description:
    'Add a leave record through the `leave` form. Dates use `dd-MMM-yyyy` (07-Jan-2026). For half/quarter days or hour-based types pass `days`, per day: `{ "07-Jan-2026": { "LeaveCount": 0.5, "Session": 2 } }` (0.25 = quarter day; hour-based `LeaveCount` is `hh:mm`).',
  idempotent: false,
  params: [
    {
      key: "employeeId",
      label: "Employee record ID",
      type: "string",
      required: true,
      hint:
        "The employee's Zoho record id (the `recordId` from Get Employee), as the API's `Employee_ID` field.",
    },
    {
      key: "leaveTypeId",
      label: "Leave type ID",
      type: "string",
      required: true,
      hint: "The `Id` from Get Leave Types & Balances.",
    },
    { key: "from", label: "From", type: "string", required: true, placeholder: "07-Jan-2026" },
    { key: "to", label: "To", type: "string", required: true, placeholder: "07-Jan-2026" },
    {
      key: "days",
      label: "Per-day breakdown",
      type: "json",
      hint: "Optional, for partial days or hour-based leave. Keyed by dd-MMM-yyyy date.",
    },
    {
      key: "extraFields",
      label: "Extra fields",
      type: "json",
      hint: "Optional additional `leave` form fields (e.g. a reason), merged into the record.",
    },
  ],
  output: [
    { key: "pkId", type: "string", label: "Id of the created leave record" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    for (const k of ["employeeId", "leaveTypeId", "from", "to"] as const) {
      if (!input[k]) throw new Error(`\`${k}\` is required.`);
    }
    const data: Record<string, unknown> = {
      ...(input.extraFields ? jsonObject(input.extraFields, "extraFields") : {}),
      Employee_ID: input.employeeId,
      Leavetype: input.leaveTypeId,
      From: input.from,
      To: input.to,
    };
    if (input.days) data.days = jsonObject(input.days, "days");
    const { result, message } = await peopleCall(ctx, `${API}/forms/json/leave/insertRecord`, {
      method: "POST",
      form: { inputData: JSON.stringify(data) },
    });
    const r = (result ?? {}) as { pkId?: string };
    return { pkId: r.pkId ?? null, message };
  },
};

export default leaveApply;
