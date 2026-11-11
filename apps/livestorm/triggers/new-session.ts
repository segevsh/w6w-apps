import sessionList from "../actions/session-list.ts";
import { sinceFeed } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions?filter[created_since]=…` — the workspace-wide session list, 0-indexed pages
 * (https://developers.livestorm.co/reference/get_sessions, verified 2026-11-10). The list has no
 * sort parameter, so this is a since-filter poll. Also delivers what `event-session-list` returns
 * (the same sessions, one event at a time).
 */
export default sinceFeed({
  key: "new-session",
  title: "New Session",
  description: "The run gets each Livestorm session newly created, across all events.",
  action: sessionList,
  stamp: "created_at",
  input: ({ since, page, pageSize }) => ({
    createdSince: since,
    pageNumber: page,
    pageSize,
  }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Session attributes (name, status, created_at, …)",
    },
  ],
  sample: {
    id: "4c0e2a52-2222-4a2b-9d3e-0a1b2c3d4e5f",
    type: "sessions",
    attributes: {
      name: "Product launch webinar",
      status: "upcoming",
      created_at: 1794700800,
      updated_at: 1794700800,
    },
  },
});
