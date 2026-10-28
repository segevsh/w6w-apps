import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  logId: string;
}

const timelogGet: ActionDefinition<Input> = {
  key: "timelog-get",
  type: "read",
  resource: "timelog",
  title: "Get Time Log",
  description: "Fetch one time log.",
  params: [
    portalId,
    projectId,
    {
      key: "logId",
      label: "Time Log ID",
      type: "string",
      required: true,
      hint: "The id of a time log.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/logs/${enc(input.logId)}`,
    );
    return { item: body };
  },
};

export default timelogGet;
