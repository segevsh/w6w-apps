import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company, seg } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  pipelineId: string;
}

/**
 * `GET /company/{id}/pipeline/{id}` — the stages. An unknown pipeline id does NOT 404: Breezy
 * answers with its built-in default pipeline's stages instead.
 */
const pipelineGet: ActionDefinition<Input> = {
  key: "pipeline-get",
  type: "read",
  resource: "pipeline",
  title: "Get Pipeline",
  description:
    "Read a pipeline's ordered stages. The stage `id` is what Set Candidate Stage and Move Candidate take.",
  params: [
    companyIdParam,
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      required: true,
      default: "default",
      hint:
        "A pipeline id, or `default` / `default_pool`. An id Breezy does not recognise silently returns the default pipeline.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "pipeline", type: "array", label: "Stages (id, name, type, icon)" },
  ],

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "GET",
      `${company(input.companyId)}/pipeline/${seg(input.pipelineId)}`,
    );
  },
};

export default pipelineGet;
