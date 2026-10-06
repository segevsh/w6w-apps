import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  candidateId: string;
}

const candidateGet: ActionDefinition<Input> = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get Candidate",
  description: "Fetch one candidate by id (`GET /v1/candidates/{id}`).",
  params: [slugParam("candidateId", "Candidate id", "candidate")],
  output: [{ key: "first_name", type: "string", label: "First name" }, {
    key: "last_name",
    type: "string",
    label: "Last name",
  }, { key: "email", type: "string", label: "Email" }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/candidates/${encodeId(input.candidateId)}`);
  },
};

export default candidateGet;
