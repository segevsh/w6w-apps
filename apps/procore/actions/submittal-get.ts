import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  submittalId: number;
}

/** `GET /rest/v1.0/projects/{project_id}/submittals/{id}` */
const submittalGet: ActionDefinition<Input> = {
  key: "submittal-get",
  type: "read",
  resource: "submittal",
  title: "Get Submittal",
  description: "Fetch one submittal with its status, approvers and attachments.",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "submittalId",
      label: "Submittal ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Submittal ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "object", label: "Status" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/submittals/${
        encodeURIComponent(String(input.submittalId))
      }`,
      { companyId: input.companyId },
    );
    return reply.data;
  },
};

export default submittalGet;
