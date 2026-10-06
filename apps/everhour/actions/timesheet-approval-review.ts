import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toObject } from "../lib/client.ts";

/**
 * `PUT /timesheets/{timesheetId}/approval` — Approve or reject a submitted timesheet.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  timesheetId: number;
  status: string;
  days?: unknown;
  comment?: string;
  sendNotification?: boolean;
}

const timesheetApprovalReview: ActionDefinition<Input> = {
  key: "timesheet-approval-review",
  type: "perform",
  resource: "timesheet",
  title: "Approve Or Reject Timesheet",
  description: "Approve or reject a submitted timesheet.",
  idempotent: true,
  params: [
    {
      key: "timesheetId",
      label: "Timesheet ID",
      type: "number",
      required: true,
      hint: "User id followed by week id, e.g. user 14856 + week 2535 = `148562535`.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "approved", label: "approved" }, { value: "rejected", label: "rejected" }],
    },
    {
      key: "days",
      label: "Days",
      type: "json",
      hint: 'JSON `{"monday": true, "tuesday": false, ...}`; omit when every day is approved.',
    },
    { key: "comment", label: "Comment", type: "text" },
    { key: "sendNotification", label: "Send notification", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Timesheet ID" },
    { key: "user", type: "number", label: "User ID" },
    { key: "weekId", type: "number", label: "Week ID" },
    { key: "status", type: "string", label: "Approval status" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/timesheets/${encodeId(input.timesheetId)}/approval`, {
      method: "PUT",
      body: compact({
        days: toObject(input.days, "days"),
        status: input.status,
        comment: input.comment,
        sendNotification: input.sendNotification,
      }),
    });
  },
};

export default timesheetApprovalReview;
