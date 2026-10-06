import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  stageId: string;
}

/**
 * `PUT …/candidate/{id}/stage` — 204. Fires the stage's configured actions and the
 * `candidateStatusUpdated` webhook; a "Hired"-type stage marks the candidate hired. An unknown
 * stage id fails the request.
 */
const candidateSetStage: ActionDefinition<Input> = {
  key: "candidate-set-stage",
  type: "perform",
  resource: "candidate",
  title: "Set Candidate Stage",
  description:
    "Move a candidate to another stage of their position's pipeline. Runs the stage's automations; a Hired stage marks them hired.",
  idempotent: true,
  params: [
    ...candidateParams,
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      required: true,
      hint: "A stage id from Get Pipeline for this position's pipeline.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether Breezy accepted the move" },
    { key: "stageId", type: "string", label: "The stage the candidate was moved to" },
  ],

  async execute(input, ctx) {
    await new BreezyClient(ctx).request(
      "PUT",
      `${candidate(input.companyId, input.positionId, input.candidateId)}/stage`,
      { body: { stage_id: input.stageId } },
    );
    return { ok: true, stageId: input.stageId };
  },
};

export default candidateSetStage;
