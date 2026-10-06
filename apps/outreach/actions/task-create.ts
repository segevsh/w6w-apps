import { createAction } from "../lib/factory.ts";

export default createAction({
  key: "task-create",
  title: "Create Task",
  noun: "Task",
  type: "task",
  path: "tasks",
  description: "Create a manual task for a prospect, assigned to an owner.",
  attrParams: [
    {
      key: "action",
      label: "Action type",
      type: "select",
      options: [
        { value: "action_item", label: "Action item" },
        { value: "call", label: "Call" },
        { value: "email", label: "Email" },
        { value: "in_person", label: "In person" },
      ],
    },
    { key: "dueAt", label: "Due at", type: "datetime" },
    { key: "note", label: "Note", type: "text" },
  ],
  relParams: [
    { param: "prospectId", rel: "prospect", type: "prospect" },
    { param: "ownerId", rel: "owner", type: "user" },
  ],
  relFieldParams: [
    {
      key: "prospectId",
      label: "Prospect ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "ownerId",
      label: "Owner (user) ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
  ],
});
