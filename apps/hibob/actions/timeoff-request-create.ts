import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, requireDate, requireString } from "../lib/params.ts";

interface Input {
  employeeId: string;
  requestRangeType: "days" | "hours";
  policyType: string;
  startDate: string;
  endDate: string;
  startDatePortion?: string;
  endDatePortion?: string;
  hours?: number;
  minutes?: number;
  skipManagerApproval?: boolean;
  approver?: string;
  description?: string;
  reasonCode?: number;
}

/**
 * `POST /v1/timeoff/employees/{id}/requests` — submit a time off request.
 *
 * Bob's body is a oneOf keyed by `requestRangeType`; this action covers the two
 * common arms and leaves the other five (`portionOnRange`, `hoursOnRange`,
 * `differentDayDurations`, `specificHoursDayDurations`,
 * `differentSpecificHoursDayDurations`) out rather than guessing their shapes:
 *
 *  - `days`: needs `startDatePortion` (`all_day | afternoon`) and
 *    `endDatePortion` (`all_day | morning`).
 *  - `hours`: needs `hours` + `minutes`, only for policy types measured in hours;
 *    `endDate` must equal `startDate`.
 *
 * `skipManagerApproval` creates an already-approved request and is admin-only.
 * The reference documents the 200 as "Successfully submitted" with no schema, so
 * whatever body Bob returns is passed through.
 */
const timeoffRequestCreate: ActionDefinition<Input> = {
  key: "timeoff-request-create",
  type: "perform",
  idempotent: false,
  resource: "timeoff",
  title: "Submit Time Off Request",
  description: "Submit a days-based or hours-based time off request for an employee.",
  params: [
    employeeIdParam,
    {
      key: "requestRangeType",
      label: "Request type",
      type: "select",
      required: true,
      default: "days",
      options: [
        { value: "days", label: "Days" },
        { value: "hours", label: "Hours (hour-based policies only)" },
      ],
    },
    {
      key: "policyType",
      label: "Policy type",
      type: "string",
      required: true,
      hint: "A policy type name such as Holiday or Sick — see List Time Off Policy Types.",
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      required: true,
      hint: "For hours requests this must equal the start date.",
    },
    {
      key: "startDatePortion",
      label: "Start day portion",
      type: "select",
      default: "all_day",
      options: [
        { value: "all_day", label: "All day" },
        { value: "afternoon", label: "Afternoon only" },
      ],
    },
    {
      key: "endDatePortion",
      label: "End day portion",
      type: "select",
      default: "all_day",
      options: [
        { value: "all_day", label: "All day" },
        { value: "morning", label: "Morning only" },
      ],
    },
    { key: "hours", label: "Hours", type: "number", hint: "Required for an hours request." },
    { key: "minutes", label: "Minutes", type: "number", hint: "Required for an hours request." },
    {
      key: "skipManagerApproval",
      label: "Skip manager approval",
      type: "boolean",
      hint: "Admins only. Creates an already-approved request.",
    },
    {
      key: "approver",
      label: "Approver employee ID",
      type: "string",
      hint: "Relevant with skip approval; the caller needs permission to import time off.",
    },
    { key: "description", label: "Reason", type: "text" },
    {
      key: "reasonCode",
      label: "Reason code ID",
      type: "number",
      hint: "From the policy type's reason codes.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const type = input.requestRangeType;
    if (type !== "days" && type !== "hours") {
      throw new Error(`requestRangeType must be "days" or "hours", got "${type}"`);
    }
    const body: Record<string, unknown> = {
      requestRangeType: type,
      policyType: requireString(input.policyType, "policyType"),
      startDate: requireDate(input.startDate, "startDate"),
      endDate: requireDate(input.endDate, "endDate"),
    };
    if (type === "days") {
      body.startDatePortion = input.startDatePortion || "all_day";
      body.endDatePortion = input.endDatePortion || "all_day";
    } else {
      if (input.hours === undefined || input.minutes === undefined) {
        throw new Error("hours and minutes are required for an hours request");
      }
      if (body.startDate !== body.endDate) {
        throw new Error("endDate must equal startDate for an hours request");
      }
      body.hours = Math.trunc(Number(input.hours));
      body.minutes = Math.trunc(Number(input.minutes));
    }
    if (input.skipManagerApproval !== undefined) {
      body.skipManagerApproval = input.skipManagerApproval;
    }
    if (input.approver) body.approver = input.approver;
    if (input.description) body.description = input.description;
    if (input.reasonCode !== undefined) body.reasonCode = Math.trunc(Number(input.reasonCode));

    return await new HibobClient(ctx).ack(
      "POST",
      `/timeoff/employees/${encodeId(input.employeeId)}/requests`,
      { body },
    );
  },
};

export default timeoffRequestCreate;
