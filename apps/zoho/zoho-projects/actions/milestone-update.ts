import type { ActionDefinition } from "@w6w/types";
import { compact, enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  milestoneId: string;
  name?: string;
  flag?: string;
  ownerZpuid?: string;
  statusId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}

const milestoneUpdate: ActionDefinition<Input> = {
  key: "milestone-update",
  type: "perform",
  resource: "milestone",
  title: "Update Milestone",
  description: "Update a milestone (phase). Uses the v3.1 endpoint.",
  idempotent: true,
  params: [
    portalId,
    projectId,
    {
      key: "milestoneId",
      label: "Milestone ID",
      type: "string",
      required: true,
      hint: "From the List Milestones action.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "flag",
      label: "Visibility",
      type: "select",
      hint: "Internal or External.",
      options: [{ value: "Internal", label: "Internal" }, { value: "External", label: "External" }],
    },
    { key: "ownerZpuid", label: "Owner ZPUID", type: "string" },
    { key: "statusId", label: "Status ID", type: "string" },
    { key: "startDate", label: "Start Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End Date", type: "string", hint: "YYYY-MM-DD." },
    { key: "color", label: "Color", type: "string", hint: "Hex color for the Gantt bar." },
  ],
  output: [{ key: "item", type: "object", label: "Resulting record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).request(
      "PATCH",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/phases/${
        enc(input.milestoneId)
      }`,
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

export default milestoneUpdate;
