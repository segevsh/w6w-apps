import callList from "../actions/call-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/calls` takes `createdAfter`; maxResults is capped at 100. The endpoint is scoped to one
 * Quo number and one other party (1:1), so both are trigger params.
 * https://www.quo.com/docs/mdx/api-reference/calls/list-calls (verified 2026-11-10)
 */
export default sinceTrigger({
  key: "new-call",
  title: "New Call",
  description: "The run gets each new call between one Quo number and one other phone number.",
  action: callList,
  pageSize: 100,
  params: [
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      required: true,
      placeholder: "PN123abc",
      hint: "The Quo number whose calls to watch.",
    },
    {
      key: "participant",
      label: "Participant",
      type: "string",
      required: true,
      placeholder: "+15555555555",
      hint: "The other party's phone number (E.164). Quo lists calls 1:1 only.",
    },
  ],
  input: ({ since }, params) => ({
    phoneNumberId: params.phoneNumberId,
    participant: params.participant,
    createdAfter: since,
    maxResults: 100,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  nextPageInput: (input, result) => {
    const token = (result as { nextPageToken?: string | null }).nextPageToken;
    return token ? { ...input, pageToken: token } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => (item as { createdAt?: unknown }).createdAt,
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "direction", type: "string", label: "Direction (incoming, outgoing)" },
    { key: "status", type: "string", label: "Status" },
    { key: "duration", type: "number", label: "Duration (seconds)" },
    { key: "phoneNumberId", type: "string", label: "Phone number ID" },
    { key: "participants", type: "array", label: "Participants" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "AC123abc",
    direction: "incoming",
    status: "completed",
    duration: 42,
    phoneNumberId: "PN123abc",
    participants: ["+15555555555"],
    createdAt: "2026-11-10T09:00:00Z",
  },
});
