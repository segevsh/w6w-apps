import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `POST /timesheets/{timesheetId}/approval` — Submit a week for approval (or approve it, for an admin).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  timesheetId: number;
  comment?: string;
  reviewer?: number;
  sendNotification?: boolean;
}

const timesheetApprovalRequest: ActionDefinition<Input> = {
  key: "timesheet-approval-request",
  type: "perform",
  resource: "timesheet",
  title: "Request Timesheet Approval",
  description: "Submit a week for approval (or approve it, for an admin).",
  idempotent: false,
  params: [
    {
      key: "timesheetId",
      label: "Timesheet ID",
      type: "number",
      required: true,
      hint: "User id followed by week id, e.g. user 14856 + week 2535 = `148562535`.",
    },
    { key: "comment", label: "Comment", type: "text" },
    {
      key: "reviewer",
      label: "Reviewer user ID",
      type: "number",
      hint: "Must be an admin in the team.",
    },
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
      method: "POST",
      body: compact({
        comment: input.comment,
        reviewer: input.reviewer,
        sendNotification: input.sendNotification,
      }),
    });
  },
};

export default timesheetApprovalRequest;
