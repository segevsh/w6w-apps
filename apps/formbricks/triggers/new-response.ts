import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import responseList from "../actions/response-list.ts";

interface Response {
  id?: unknown;
  singleUseId?: unknown;
  [key: string]: unknown;
}

const PAGE_SIZE = 100;

/**
 * `GET /api/v1/management/responses?limit=100[&surveyId=…]`. Formbricks orders this list
 * `createdAt` descending (ties by `id`) — read from the handler's own query, not documented in the
 * API reference: https://github.com/formbricks/formbricks
 * (apps/web/app/api/v1/management/responses/lib/response.ts). Without `limit` the endpoint returns
 * every response ever, so the trigger always sends one. `singleUseId` is the survey's single-use
 * link token and is removed from the emitted response.
 */
const trigger: TriggerDefinition<{ surveyId?: string }> = {
  key: "new-response",
  title: "New Survey Response",
  description:
    "The run gets each new survey response in the workspace, or only for one survey when a survey ID is set.",
  params: [{
    key: "surveyId",
    label: "Survey ID",
    type: "string",
    hint: "Leave empty for responses to every survey the API key can reach.",
  }],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "surveyId", type: "string", label: "Survey ID" },
    { key: "finished", type: "boolean", label: "Finished" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "data", type: "object", label: "Answers by question" },
  ],
  sample: {
    id: "clresponse123",
    surveyId: "clsurvey123",
    finished: true,
    createdAt: "2026-11-09T09:00:00.000Z",
    data: { q1: "Very satisfied" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const { events, nextState } = await pollNewItems<Response>({
      state,
      maxPages: 1,
      maxEvents: PAGE_SIZE,
      idOf: (response) => String(response.id ?? ""),
      async fetchPage() {
        const out = await (responseList as ActionDefinition).execute({
          ...(params?.surveyId ? { surveyId: params.surveyId } : {}),
          limit: PAGE_SIZE,
        }, ctx) as { data?: Response[] };
        return { items: Array.isArray(out?.data) ? out.data : [] };
      },
    });
    return {
      events: events.map(({ singleUseId: _removed, ...response }) => response),
      nextState,
    };
  },
};

export default trigger;
