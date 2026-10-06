import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  eventId: string;
  includeAll?: boolean;
  continuation?: string;
}

const listDefaultQuestions: ActionDefinition<Input> = {
  key: "list-default-questions",
  type: "search",
  resource: "question",
  title: "List Default Questions",
  description: "List the default (canned) registration questions for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "includeAll", label: "Include whole list", type: "boolean" },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "questions", type: "array", label: "Default questions" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"questions">>(
      `/events/${encodeURIComponent(input.eventId)}/canned_questions/`,
      { query: { include_all: input.includeAll, continuation: input.continuation } },
    );
  },
};

export default listDefaultQuestions;
