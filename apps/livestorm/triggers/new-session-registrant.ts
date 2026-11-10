import sessionPeopleList from "../actions/session-people-list.ts";
import { SESSION_ID_PARAM, sessionIdOf, sinceFeed } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions/{id}/people?filter[created_since]=…` — "Filter People which 'created_at'
 * attribute starts from the given date" (https://developers.livestorm.co/reference/get_sessions-id-people,
 * verified 2026-11-10). The list has no sort parameter, so this is a since-filter poll.
 */
export default sinceFeed({
  key: "new-session-registrant",
  title: "New Session Registrant",
  description: "The run gets each person who registers for the chosen Livestorm session.",
  action: sessionPeopleList,
  params: [SESSION_ID_PARAM],
  stamp: "created_at",
  input: ({ params, since, page, pageSize }) => ({
    id: sessionIdOf(params),
    createdSince: since,
    pageNumber: page,
    pageSize,
  }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Person attributes (email, role, created_at, …)" },
  ],
  sample: {
    id: "7d1f0a52-3333-4a2b-9d3e-0a1b2c3d4e5f",
    type: "people",
    attributes: {
      email: "ada@example.test",
      role: "participant",
      created_at: 1794700800,
      updated_at: 1794700800,
    },
  },
});
