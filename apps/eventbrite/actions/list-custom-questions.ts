import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  eventId: string;
  asOwner?: boolean;
  continuation?: string;
}

const listCustomQuestions: ActionDefinition<Input> = {
  key: "list-custom-questions",
  type: "search",
  resource: "question",
  title: "List Custom Questions",
  description: "List the custom registration questions for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "asOwner",
      label: "As owner",
      type: "boolean",
      hint: "Return private events and fields.",
    },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "questions", type: "array", label: "Custom questions" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"questions">>(
      `/events/${encodeURIComponent(input.eventId)}/questions/`,
      { query: { as_owner: input.asOwner, continuation: input.continuation } },
    );
  },
};

export default listCustomQuestions;
