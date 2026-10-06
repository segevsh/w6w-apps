import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { CANDIDATE_OUTPUT, candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  targetPositionId: string;
  targetStageId: string;
  stageActionsEnabled?: boolean;
}

/** `POST …/candidate/{id}/move` — returns the updated candidate. Stage actions default to off. */
const candidateMove: ActionDefinition<Input> = {
  key: "candidate-move",
  type: "perform",
  resource: "candidate",
  title: "Move Candidate to Position",
  description:
    "Move a candidate to a stage of a different position. Use Set Candidate Stage to stay on the same position.",
  idempotent: false,
  params: [
    ...candidateParams,
    { key: "targetPositionId", label: "Target position ID", type: "string", required: true },
    {
      key: "targetStageId",
      label: "Target stage ID",
      type: "string",
      required: true,
      hint: "A stage id of the target position's pipeline.",
    },
    {
      key: "stageActionsEnabled",
      label: "Run stage actions",
      type: "boolean",
      hint: "Whether the target stage's automations (emails, questionnaires) fire. Off by default.",
    },
  ],
  output: CANDIDATE_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request(
      "POST",
      `${candidate(input.companyId, input.positionId, input.candidateId)}/move`,
      {
        body: {
          target_position_id: input.targetPositionId,
          target_stage_id: input.targetStageId,
          ...(input.stageActionsEnabled === undefined
            ? {}
            : { stage_actions_enabled: input.stageActionsEnabled }),
        },
      },
    );
  },
};

export default candidateMove;
