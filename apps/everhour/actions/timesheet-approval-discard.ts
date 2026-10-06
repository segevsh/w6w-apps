import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /timesheets/{timesheetId}/discard-approval` — Withdraw your own approval request.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  timesheetId: number;
  comment?: string;
  reviewer?: number;
  sendNotification?: boolean;
}

const timesheetApprovalDiscard: ActionDefinition<Input> = {
  key: "timesheet-approval-discard",
  type: "perform",
  resource: "timesheet",
  title: "Discard Approval Request",
  description: "Withdraw your own approval request.",
  idempotent: true,
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
    return new EverhourClient(ctx).one(
      `/timesheets/${encodeId(input.timesheetId)}/discard-approval`,
      {
        method: "PUT",
        body: compact({
          comment: input.comment,
          reviewer: input.reviewer,
          sendNotification: input.sendNotification,
        }),
      },
    );
  },
};

export default timesheetApprovalDiscard;
