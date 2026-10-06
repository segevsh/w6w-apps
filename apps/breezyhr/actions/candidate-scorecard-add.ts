import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate, compact } from "../lib/client.ts";
import { candidateParams } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  score: string;
  note?: string;
}

/**
 * `PUT …/candidate/{id}/scorecard` — 204. Attributed to the token's user; only `score` and
 * `note` are stored. 412 means the candidate has since moved to another position.
 */
const candidateScorecardAdd: ActionDefinition<Input> = {
  key: "candidate-scorecard-add",
  type: "perform",
  resource: "candidate",
  title: "Add Candidate Scorecard",
  description:
    "Record a scorecard rating, with an optional note, for a candidate on behalf of the token's user.",
  idempotent: false,
  params: [
    ...candidateParams,
    {
      key: "score",
      label: "Score",
      type: "select",
      required: true,
      options: [
        { value: "very_good", label: "Very good" },
        { value: "good", label: "Good" },
        { value: "neutral", label: "Neutral" },
        { value: "poor", label: "Poor" },
        { value: "very_poor", label: "Very poor" },
      ],
    },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether Breezy recorded the scorecard" },
    { key: "score", type: "string", label: "The score that was recorded" },
  ],

  async execute(input, ctx) {
    await new BreezyClient(ctx).request(
      "PUT",
      `${candidate(input.companyId, input.positionId, input.candidateId)}/scorecard`,
      { body: compact({ score: input.score, note: input.note || undefined }) },
    );
    return { ok: true, score: input.score };
  },
};

export default candidateScorecardAdd;
