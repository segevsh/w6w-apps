import callList from "../actions/call-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Podium Phones call that is new or changed, most recently changed first (`GET /v4/calls?order=desc`; an ended call is a new event). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-call",
  title: "New or Updated Call",
  description:
    "The run gets each Podium Phones call that is new or changed, most recently changed first (`GET /v4/calls?order=desc`; an ended call is a new event).",
  action: callList,
  input: { order: "desc" },
  stamp: "updatedAt",
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "status", type: "string", label: "Status" },
    { key: "durationSeconds", type: "number", label: "Duration (seconds)" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "call_1",
    direction: "inbound",
    status: "completed",
    durationSeconds: 95,
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
