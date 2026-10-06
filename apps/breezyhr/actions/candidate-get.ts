import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { CANDIDATE_OUTPUT, candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
}

/** `GET …/candidate/{id}` — 412 when the candidate is not on that position. */
const candidateGet: ActionDefinition<Input> = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get Candidate",
  description:
    "Read a candidate's full profile on a position: contact info, stage, source, resume, education, work history, tags, score.",
  params: candidateParams,
  output: CANDIDATE_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "GET",
      candidate(input.companyId, input.positionId, input.candidateId),
    );
  },
};

export default candidateGet;
