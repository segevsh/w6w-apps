import type { ActionDefinition } from "@w6w/types";
import { type Input, projectIdParam, projectPath } from "../lib/actions.ts";
import { compact, ZeplinClient } from "../lib/client.ts";

const updateProject: ActionDefinition<Input> = {
  key: "update-project",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description:
    "Update a project's name, description, workflow status or linked styleguide (PATCH /v1/projects/{project_id}). Only the fields you set are changed.",
  idempotent: true,
  params: [
    projectIdParam,
    { key: "name", label: "New name", type: "string" },
    { key: "description", label: "New description", type: "text" },
    {
      key: "workflowStatusId",
      label: "Workflow status ID",
      type: "string",
      hint: "Organization projects only; see the organization's workflow statuses.",
    },
    {
      key: "linkedStyleguideId",
      label: "Linked styleguide ID",
      type: "string",
      hint: "Link a styleguide to the project.",
    },
    {
      key: "unlinkStyleguide",
      label: "Unlink styleguide",
      type: "boolean",
      default: false,
      hint: "Sends `linked_styleguide_id: null`. Ignored when a linked styleguide ID is given.",
    },
  ],
  output: [{ key: "updated", type: "boolean", label: "True when the vendor answered 204" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = compact({
      name: input.name,
      description: input.description,
      workflow_status_id: input.workflowStatusId,
      linked_styleguide_id: String(input.linkedStyleguideId ?? "").trim() || undefined,
    });
    if (body.linked_styleguide_id === undefined && input.unlinkStyleguide) {
      body.linked_styleguide_id = null;
    }
    if (Object.keys(body).length === 0) throw new Error("Set at least one field to update");
    await new ZeplinClient(ctx).request("PATCH", projectPath(input), { body });
    return { updated: true };
  },
};

export default updateProject;
