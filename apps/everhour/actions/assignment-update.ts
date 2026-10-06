import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toNumberList } from "../lib/client.ts";

/**
 * `PUT /resource-planner/assignments/{assignmentId}` — Update a resource-planner assignment.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  assignmentId: number;
  project?: string;
  startDate: string;
  endDate: string;
  time?: number;
  type?: string;
  user?: number;
  users?: number[] | string;
  forceOverride?: boolean;
}

const assignmentUpdate: ActionDefinition<Input> = {
  key: "assignment-update",
  type: "perform",
  resource: "assignment",
  title: "Update Assignment",
  description: "Update a resource-planner assignment.",
  idempotent: true,
  params: [
    {
      key: "assignmentId",
      label: "Assignment ID",
      type: "number",
      required: true,
      hint: "Numeric assignment id (from List Assignments).",
    },
    {
      key: "project",
      label: "Project ID",
      type: "string",
      hint: "Project (or task) the time is scheduled against, e.g. `as:981141080110246`.",
    },
    { key: "startDate", label: "Start date", type: "date", required: true },
    { key: "endDate", label: "End date", type: "date", required: true },
    { key: "time", label: "Scheduled time", type: "number", hint: "Scheduled time in seconds." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "project", label: "project" }, { value: "time-off", label: "time-off" }],
      hint: "Assignment type.",
    },
    { key: "user", label: "User ID", type: "number", hint: "One user." },
    {
      key: "users",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated ids: create the same schedule for several users.",
    },
    { key: "forceOverride", label: "Force override", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Assignment ID" },
    { key: "startDate", type: "string", label: "Start date" },
    { key: "endDate", type: "string", label: "End date" },
    { key: "user", type: "number", label: "User ID" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(
      `/resource-planner/assignments/${encodeId(input.assignmentId)}`,
      {
        method: "PUT",
        body: compact({
          endDate: input.endDate,
          project: input.project,
          startDate: input.startDate,
          time: input.time,
          type: input.type,
          user: input.user,
          users: toNumberList(input.users),
          forceOverride: input.forceOverride,
        }),
      },
    );
  },
};

export default assignmentUpdate;
