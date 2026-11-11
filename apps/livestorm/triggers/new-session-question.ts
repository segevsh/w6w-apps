import sessionQuestionsList from "../actions/session-questions-list.ts";
import { boundedList, SESSION_ID_PARAM, sessionIdOf } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions/{id}/questions` — one session's Q&A, 0-indexed pages of 100; the endpoint has
 * no sort or since filter (https://developers.livestorm.co/reference/get_sessions-id-questions,
 * verified 2026-11-10), so the bounded list is compared check to check. Questions asked in one
 * session are in the hundreds at most; past 5000 rows the trigger refuses rather than compare a
 * partial list.
 */
export default boundedList({
  key: "new-session-question",
  title: "New Session Question",
  description: "The run gets each question asked in the chosen Livestorm session.",
  action: sessionQuestionsList,
  params: [SESSION_ID_PARAM],
  paged: true,
  input: ({ params, page, pageSize }) => ({
    id: sessionIdOf(params),
    pageNumber: page,
    pageSize,
  }),
  output: [
    { key: "id", type: "string", label: "Question ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Question attributes (text, author, created_at, …)",
    },
  ],
  sample: {
    id: "8e2a1b63-4444-4a2b-9d3e-0a1b2c3d4e5f",
    type: "questions",
    attributes: { text: "Will the recording be shared?", created_at: 1794700900 },
  },
});
