import type { Param } from "@w6w/types";
import type { WriteSpec } from "./actions.ts";

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELED"] as const;

const DATE_HINT = "Date as Rippling returns it (YYYY-MM-DD). The reference declares only `string`.";

function p(param: Param, wire: string): WriteSpec["fields"][number] {
  return { param, wire };
}

export function leaveFields(create: boolean): WriteSpec["fields"] {
  return [
    p({ key: "workerId", label: "Worker ID", type: "string", required: create }, "worker_id"),
    p({
      key: "status",
      label: "Status",
      type: "select",
      required: create,
      options: LEAVE_STATUSES.map((v) => ({ value: v, label: v })),
    }, "status"),
    p(
      { key: "startDate", label: "Start date", type: "string", required: create, hint: DATE_HINT },
      "start_date",
    ),
    p(
      { key: "endDate", label: "End date", type: "string", required: create, hint: DATE_HINT },
      "end_date",
    ),
    p({ key: "startTime", label: "Start time", type: "string" }, "start_time"),
    p({ key: "endTime", label: "End time", type: "string" }, "end_time"),
    p({
      key: "startDateCustomHours",
      label: "Hours off on the start date",
      type: "number",
    }, "start_date_custom_hours"),
    p({
      key: "endDateCustomHours",
      label: "Hours off on the end date",
      type: "number",
    }, "end_date_custom_hours"),
    p({
      key: "leaveTypeId",
      label: "Leave type ID",
      type: "string",
      hint: "Either a leave type or a leave policy is required on create (see List Leave Types).",
    }, "leave_type_id"),
    p({ key: "leavePolicyId", label: "Leave policy ID", type: "string" }, "leave_policy_id"),
    p({ key: "leaveEventId", label: "Leave event ID", type: "string" }, "leave_event_id"),
    p({
      key: "requesterId",
      label: "Requester ID",
      type: "string",
      hint: "The worker who requested it.",
    }, "requester_id"),
    p({ key: "reviewerId", label: "Reviewer ID", type: "string" }, "reviewer_id"),
    p(
      { key: "reviewedAt", label: "Reviewed at", type: "string", hint: "Timestamp of the review." },
      "reviewed_at",
    ),
    p({ key: "comments", label: "Comments", type: "text" }, "comments"),
    p({ key: "reasonForLeave", label: "Reason for leave", type: "string" }, "reason_for_leave"),
  ];
}
