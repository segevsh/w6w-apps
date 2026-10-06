import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  name?: string;
  description?: string;
  ownerZpuid?: string;
  isPublicProject?: boolean;
  startDate?: string;
  endDate?: string;
  statusId?: string;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's name, description, owner, dates, visibility or status.",
  idempotent: true,
  params: [
    portalId,
    projectId,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "ownerZpuid",
      label: "Owner ZPUID",
      type: "string",
      hint: "ZPUID of the project owner.",
    },
    { key: "isPublicProject", label: "Public Project", type: "boolean" },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "statusId", label: "Status ID", type: "string" },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "PATCH",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}`,
      {
        body: compact({
          name: input.name,
          owner: input.ownerZpuid ? { zpuid: input.ownerZpuid } : undefined,
          description: input.description,
          is_public_project: input.isPublicProject,
          start_date: input.startDate,
          end_date: input.endDate,
          status: input.statusId ? { id: input.statusId } : undefined,
        }),
      },
    );
    return { item: body };
  },
};

export default projectUpdate;
