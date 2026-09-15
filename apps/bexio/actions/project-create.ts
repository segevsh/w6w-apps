import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  name: string;
  projectTypeId: number;
  stateId: number;
  userId: number;
  startDate?: string;
  endDate?: string;
  comment?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project (pr_project).",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "projectTypeId",
      label: "Project type ID",
      type: "number",
      required: true,
      hint: "References a pr_project_type object.",
    },
    {
      key: "stateId",
      label: "State ID",
      type: "number",
      required: true,
      hint: "References a pr_project_state object.",
    },
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "comment", label: "Comment", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/pr_project", {
      contact_id: input.contactId,
      name: input.name,
      pr_project_type_id: input.projectTypeId,
      pr_state_id: input.stateId,
      user_id: input.userId,
      start_date: input.startDate,
      end_date: input.endDate,
      comment: input.comment,
    });
  },
};

export default projectCreate;
