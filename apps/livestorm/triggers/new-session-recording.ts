import sessionRecordingsList from "../actions/session-recordings-list.ts";
import { boundedList, SESSION_ID_PARAM, sessionIdOf } from "../lib/triggers.ts";

/**
 * `GET /v1/sessions/{id}/recordings` — one session's recordings, 0-indexed pages of 100; the
 * endpoint has no sort or since filter
 * (https://developers.livestorm.co/reference/get_sessions-id-recordings, verified 2026-11-10).
 * A session has a handful of recordings, so the bounded list is compared check to check.
 */
export default boundedList({
  key: "new-session-recording",
  title: "New Session Recording",
  description:
    "The run gets each recording that becomes available for the chosen Livestorm session.",
  action: sessionRecordingsList,
  params: [SESSION_ID_PARAM],
  paged: true,
  input: ({ params, page, pageSize }) => ({
    id: sessionIdOf(params),
    pageNumber: page,
    pageSize,
  }),
  output: [
    { key: "id", type: "string", label: "Recording ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Recording attributes (duration, created_at, …)",
    },
  ],
  sample: {
    id: "9f3b2c74-5555-4a2b-9d3e-0a1b2c3d4e5f",
    type: "recordings",
    attributes: { duration: 3600, created_at: 1794708000 },
  },
});
