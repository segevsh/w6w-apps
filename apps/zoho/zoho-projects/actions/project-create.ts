import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId } from "../lib/params.ts";

interface Input {
  portalId: string;
  name: string;
  projectType?: string;
  ownerZpuid: string;
  description?: string;
  isPublicProject?: boolean;
  startDate?: string;
  endDate?: string;
  statusId?: string;
  layoutId?: string;
  copyFrom?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project in a portal. Optionally copy the configuration of a template or existing project.",
  idempotent: false,
  params: [
    portalId,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "projectType",
      label: "Project Type",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "template", label: "Template" }],
    },
    {
      key: "ownerZpuid",
      label: "Owner ZPUID",
      type: "string",
      required: true,
      hint: "ZPUID of the project owner.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "isPublicProject", label: "Public Project", type: "boolean" },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "statusId", label: "Status ID", type: "string" },
    { key: "layoutId", label: "Layout ID", type: "string" },
    {
      key: "copyFrom",
      label: "Copy From",
      type: "string",
      hint: "Template or project ID to copy configuration from.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects`,
      {
        body: compact({
          name: input.name,
          project_type: input.projectType,
          owner: { zpuid: input.ownerZpuid },
          description: input.description,
          is_public_project: input.isPublicProject,
          start_date: input.startDate,
          end_date: input.endDate,
          status: input.statusId ? { id: input.statusId } : undefined,
          layout: input.layoutId ? { id: input.layoutId } : undefined,
          copy_from: input.copyFrom,
        }),
      },
    );
    return { item: body };
  },
};

export default projectCreate;
