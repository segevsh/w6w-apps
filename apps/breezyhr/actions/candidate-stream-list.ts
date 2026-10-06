import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { candidateParams, skipParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  skip?: number;
}

interface Activity {
  first_activity?: boolean;
}

export const PAGE = 50;

/**
 * `GET …/candidate/{id}/stream` — 50 records per page, `skip` to page. The oldest record is
 * flagged `first_activity: true`, so a page holding it is the last. New activity `type`s appear
 * over time; the `object` payload varies by `type`.
 */
const candidateStreamList: ActionDefinition<Input> = {
  key: "candidate-stream-list",
  type: "search",
  resource: "candidate",
  title: "List Candidate Activity",
  description:
    "Read a candidate's activity stream: stage moves, notes, interviews, documents, questionnaires, newest first.",
  params: [...candidateParams, skipParam],
  output: [
    { key: "activities", type: "array", label: "Activity events (type, object, timestamp)" },
    { key: "nextSkip", type: "number", label: "Skip value for the next page, when there is one" },
  ],

  async execute(input, ctx) {
    const activities = await new BreezyClient(ctx).array<Activity>(
      `${candidate(input.companyId, input.positionId, input.candidateId)}/stream`,
      { query: { skip: input.skip } },
    );
    const last = activities.some((a) => a.first_activity === true);
    return {
      activities,
      ...(!last && activities.length >= PAGE ? { nextSkip: (input.skip ?? 0) + PAGE } : {}),
    };
  },
};

export default candidateStreamList;
