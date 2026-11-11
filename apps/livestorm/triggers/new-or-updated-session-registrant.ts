import sessionPeopleList from "../actions/session-people-list.ts";
import { SESSION_ID_PARAM, sessionIdOf, sinceFeed } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions/{id}/people?filter[updated_since]=…`; the dedupe id carries
 * `attributes.updated_at`, so a registrant who attends or is edited is a new event
 * (https://developers.livestorm.co/reference/get_sessions-id-people, verified 2026-11-10).
 */
export default sinceFeed({
  key: "new-or-updated-session-registrant",
  title: "New or Updated Session Registrant",
  description:
    "The run gets each registrant of the chosen Livestorm session who is added or changes (for example attends), once per change.",
  action: sessionPeopleList,
  params: [SESSION_ID_PARAM],
  stamp: "updated_at",
  input: ({ params, since, page, pageSize }) => ({
    id: sessionIdOf(params),
    updatedSince: since,
    pageNumber: page,
    pageSize,
  }),
  idOf: (item) => {
    const updated = (item.attributes as { updated_at?: unknown } | undefined)?.updated_at;
    return `${String(item.id ?? "")}:${String(updated ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Person attributes (email, role, updated_at, …)" },
  ],
  sample: {
    id: "7d1f0a52-3333-4a2b-9d3e-0a1b2c3d4e5f",
    type: "people",
    attributes: {
      email: "ada@example.test",
      role: "participant",
      created_at: 1794700800,
      updated_at: 1794704400,
    },
  },
});
