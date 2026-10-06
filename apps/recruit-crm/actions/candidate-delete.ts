import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  candidateId: string;
}

const candidateDelete: ActionDefinition<Input> = {
  key: "candidate-delete",
  type: "perform",
  resource: "candidate",
  title: "Delete Candidate",
  description: "Delete a candidate (`DELETE /v1/candidates/{id}`). Not reversible through the API.",
  idempotent: true,
  params: [slugParam("candidateId", "Candidate id", "candidate")],
  output: [{ key: "deleted", type: "boolean", label: "Request accepted" }],

  async execute(input, ctx) {
    await new RecruitClient(ctx).json(`/candidates/${encodeId(input.candidateId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default candidateDelete;
