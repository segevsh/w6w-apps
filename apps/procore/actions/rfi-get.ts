import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  rfiId: number;
}

/** `GET /rest/v1.0/projects/{project_id}/rfis/{id}` */
const rfiGet: ActionDefinition<Input> = {
  key: "rfi-get",
  type: "read",
  resource: "rfi",
  title: "Get RFI",
  description: "Fetch one RFI with its questions, responses, status and assignees.",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "rfiId",
      label: "RFI ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "RFI ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "questions", type: "array", label: "Questions" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}/rfis/${
        encodeURIComponent(String(input.rfiId))
      }`,
      { companyId: input.companyId },
    );
    return reply.data;
  },
};

export default rfiGet;
