import type { ActionDefinition } from "@w6w/types";
import { compact, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `POST /resource-planner/assignments` — Create a time-off entry (goes through the resource-planner assignments endpoint).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  startDate: string;
  endDate: string;
  timeOffType: number;
  user?: number;
  timeOffPeriod?: string;
  status?: string;
  sendNotification?: boolean;
  reviewer?: number;
  considerAllocations?: boolean;
  attachments?: number[] | string;
  forceOverride?: boolean;
}

const timeOffCreate: ActionDefinition<Input> = {
  key: "time-off-create",
  type: "perform",
  resource: "time-off",
  title: "Create Time Off",
  description: "Create a time-off entry (goes through the resource-planner assignments endpoint).",
  idempotent: false,
  params: [
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    {
      key: "timeOffType",
      label: "Time-off type ID",
      type: "number",
      required: true,
      hint: "From List Time-Off Types.",
    },
    { key: "user", label: "User ID", type: "number" },
    {
      key: "timeOffPeriod",
      label: "Period",
      type: "select",
      options: [
        { value: "full-day", label: "full-day" },
        { value: "half-of-day", label: "half-of-day" },
        { value: "quarter-of-day", label: "quarter-of-day" },
        { value: "half-and-quarter-of-day", label: "half-and-quarter-of-day" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "pending", label: "pending" }, { value: "approved", label: "approved" }],
      hint: "Admins may create `approved`; everyone else creates `pending`.",
    },
    { key: "sendNotification", label: "Send notification", type: "boolean" },
    {
      key: "reviewer",
      label: "Reviewer user ID",
      type: "number",
      hint: "Admin who receives the approval request.",
    },
    {
      key: "considerAllocations",
      label: "Consider allocations",
      type: "boolean",
      hint: "Off allows creating time off past the allocated limit.",
    },
    { key: "attachments", label: "Attachment IDs", type: "string" },
    { key: "forceOverride", label: "Force override", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Assignment ID" },
    { key: "startDate", type: "string", label: "Start date" },
    { key: "endDate", type: "string", label: "End date" },
    { key: "user", type: "number", label: "User ID" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/resource-planner/assignments`, {
      method: "POST",
      body: compact({
        type: "time-off",
        startDate: input.startDate,
        endDate: input.endDate,
        timeOffType: input.timeOffType,
        user: input.user,
        timeOffPeriod: input.timeOffPeriod,
        status: input.status,
        sendNotification: input.sendNotification,
        reviewer: input.reviewer,
        considerAllocations: input.considerAllocations,
        attachments: toNumberList(input.attachments),
        forceOverride: input.forceOverride,
      }),
    });
  },
};

export default timeOffCreate;
