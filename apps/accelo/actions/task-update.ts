import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "task-update",
  resource: "task",
  path: "/tasks",
  idKey: "taskId",
  idLabel: "Task ID",
  title: "Update Task",
  description:
    "Change a task's title, description, people, priority or dates. Unset fields are left alone.",
  fields: [
    { key: "title", wire: "title", label: "Title" },
    { key: "description", wire: "description", label: "Description", type: "text" },
    {
      key: "assigneeId",
      wire: "assignee_id",
      label: "Assignee staff ID",
      type: "number",
      row: "people",
    },
    {
      key: "managerId",
      wire: "manager_id",
      label: "Manager staff ID",
      type: "number",
      row: "people",
    },
    {
      key: "dateStarted",
      wire: "date_started",
      label: "Start",
      type: "number",
      row: "dates",
      hint: "Unix timestamp, seconds.",
    },
    {
      key: "dateDue",
      wire: "date_due",
      label: "Due",
      type: "number",
      row: "dates",
      hint: "Unix timestamp, seconds.",
    },
    {
      key: "priorityId",
      wire: "priority_id",
      label: "Priority ID",
      type: "number",
      advanced: true,
    },
    {
      key: "affiliationId",
      wire: "affiliation_id",
      label: "Affiliation ID",
      type: "number",
      advanced: true,
    },
    {
      key: "remaining",
      wire: "remaining",
      label: "Remaining seconds",
      type: "number",
      advanced: true,
    },
  ],
});
