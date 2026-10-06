import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, requireDate } from "../lib/params.ts";

interface Input {
  employeeId: string;
  terminationDate: string;
  terminationReason?: string;
  reasonType?: string;
  lastDayOfWork?: string;
  noticePeriodLength?: number;
  noticePeriodUnit?: string;
}

/**
 * `POST /v1/employees/{identifier}/terminate` — sets the lifecycle status to
 * Terminated as of `terminationDate`. Needs Edit on the Lifecycle table. The
 * notice period is only sent when BOTH length and unit are given
 * (`days | weeks | month | years` — "month" is spelled that way in the schema).
 */
const personTerminate: ActionDefinition<Input> = {
  key: "person-terminate",
  type: "perform",
  idempotent: false,
  resource: "employee",
  title: "Terminate Employee",
  description: "Terminate an employee as of a date.",
  params: [
    employeeIdParam,
    { key: "terminationDate", label: "Termination date", type: "date", required: true },
    { key: "terminationReason", label: "Termination reason", type: "string" },
    {
      key: "reasonType",
      label: "Reason type",
      type: "string",
      hint: "An item of the company's termination reason-type list.",
    },
    { key: "lastDayOfWork", label: "Last day of work", type: "date" },
    { key: "noticePeriodLength", label: "Notice period length", type: "number" },
    {
      key: "noticePeriodUnit",
      label: "Notice period unit",
      type: "select",
      options: [
        { value: "days", label: "Days" },
        { value: "weeks", label: "Weeks" },
        { value: "month", label: "Months" },
        { value: "years", label: "Years" },
      ],
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      terminationDate: requireDate(input.terminationDate, "terminationDate"),
    };
    if (input.terminationReason) body.terminationReason = input.terminationReason;
    if (input.reasonType) body.reasonType = input.reasonType;
    if (input.lastDayOfWork) body.lastDayOfWork = requireDate(input.lastDayOfWork, "lastDayOfWork");
    if (input.noticePeriodLength !== undefined && input.noticePeriodUnit) {
      body.noticePeriod = {
        unit: input.noticePeriodUnit,
        length: Math.trunc(Number(input.noticePeriodLength)),
      };
    }
    return await new HibobClient(ctx).ack(
      "POST",
      `/employees/${encodeId(input.employeeId)}/terminate`,
      { body },
    );
  },
};

export default personTerminate;
