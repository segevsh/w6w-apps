import sessionList from "../actions/session-list.ts";
import { sinceFeed } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions?filter[updated_since]=…`; the dedupe id carries `attributes.updated_at`, so an
 * edited or rescheduled session is a new event
 * (https://developers.livestorm.co/reference/get_sessions, verified 2026-11-10).
 */
export default sinceFeed({
  key: "new-or-updated-session",
  title: "New or Updated Session",
  description: "The run gets each Livestorm session that is created or edited, once per edit.",
  action: sessionList,
  stamp: "updated_at",
  input: ({ since, page, pageSize }) => ({
    updatedSince: since,
    pageNumber: page,
    pageSize,
  }),
  idOf: (item) => {
    const updated = (item.attributes as { updated_at?: unknown } | undefined)?.updated_at;
    return `${String(item.id ?? "")}:${String(updated ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Session attributes (name, status, updated_at, …)",
    },
  ],
  sample: {
    id: "4c0e2a52-2222-4a2b-9d3e-0a1b2c3d4e5f",
    type: "sessions",
    attributes: {
      name: "Product launch webinar",
      status: "upcoming",
      created_at: 1794700800,
      updated_at: 1794704400,
    },
  },
});
