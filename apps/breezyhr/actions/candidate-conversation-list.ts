import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, candidate } from "../lib/client.ts";
import { candidateParams, skipParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  candidateId: string;
  skip?: number;
  includeDelayed?: boolean;
}

interface Item {
  first_activity?: boolean;
}

const PAGE = 50;

/**
 * `GET …/candidate/{id}/conversation` — newest first, 50 per page via `skip`. The thread is
 * scoped to the candidate, not the position: for a caller who can manage the candidate's other
 * positions it merges that person's messages from those applications too. Scheduled (delayed)
 * messages are left out unless `include_delayed=1`.
 */
const candidateConversationList: ActionDefinition<Input> = {
  key: "candidate-conversation-list",
  type: "search",
  resource: "candidate",
  title: "List Candidate Messages",
  description:
    "Read the message thread with a candidate (messages and interview proposals), newest first.",
  params: [
    ...candidateParams,
    skipParam,
    {
      key: "includeDelayed",
      label: "Include scheduled messages",
      type: "boolean",
      hint: "Also return messages queued for delayed sending.",
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Conversation items" },
    { key: "nextSkip", type: "number", label: "Skip value for the next page, when there is one" },
  ],

  async execute(input, ctx) {
    const messages = await new BreezyClient(ctx).array<Item>(
      `${candidate(input.companyId, input.positionId, input.candidateId)}/conversation`,
      { query: { skip: input.skip, include_delayed: input.includeDelayed ? 1 : undefined } },
    );
    const last = messages.some((m) => m.first_activity === true);
    return {
      messages,
      ...(!last && messages.length >= PAGE ? { nextSkip: (input.skip ?? 0) + PAGE } : {}),
    };
  },
};

export default candidateConversationList;
