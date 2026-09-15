import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v3/milestones` — list project milestones. */
interface Input {
  client_id?: number;
  project_id?: number;
  phase_id?: number;
  page?: number;
  "per-page"?: number;
}

const milestoneList: ActionDefinition<Input> = {
  key: "milestone-list",
  type: "read",
  resource: "milestone",
  title: "List Milestones",
  description: "List milestones for a project (or client, or phase).",
  params: [
    { key: "client_id", label: "Client ID", type: "number", validation: { integer: true } },
    { key: "project_id", label: "Project ID", type: "number", validation: { integer: true } },
    { key: "phase_id", label: "Phase ID", type: "number", validation: { integer: true } },
    ...paginationParams(),
  ],
  output: [
    { key: "milestone_id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "date", type: "string", label: "Start date/time" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/milestones", {
      client_id: input.client_id,
      project_id: input.project_id,
      phase_id: input.phase_id,
      page: input.page,
      "per-page": input["per-page"],
    });
    return { items, pagination };
  },
};

export default milestoneList;
