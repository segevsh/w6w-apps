import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  name: string;
  ownerZpuid: string;
  statusId: string;
  flag?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}

const milestoneCreate: ActionDefinition<Input> = {
  key: "milestone-create",
  type: "perform",
  resource: "milestone",
  title: "Create Milestone",
  description:
    "Create a milestone (phase) in a project. The vendor requires an owner and a status.",
  idempotent: false,
  params: [
    portalId,
    projectId,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "ownerZpuid", label: "Owner ZPUID", type: "string", required: true },
    { key: "statusId", label: "Status ID", type: "string", required: true },
    {
      key: "flag",
      label: "Visibility",
      type: "select",
      hint: "Internal or External.",
      options: [{ value: "Internal", label: "Internal" }, { value: "External", label: "External" }],
    },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "color", label: "Color", type: "string", hint: "Hex color for the Gantt bar." },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "POST",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/phases`,
      {
        body: compact({
          name: input.name,
          flag: input.flag,
          owner: input.ownerZpuid ? { zpuid: input.ownerZpuid } : undefined,
          status: input.statusId ? { id: input.statusId } : undefined,
          start_date: input.startDate,
          end_date: input.endDate,
          color: input.color,
        }),
        version: "v3.1",
      },
    );
    return { item: body };
  },
};

export default milestoneCreate;
