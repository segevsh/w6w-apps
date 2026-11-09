import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

/** Polls `call-list` (`GET /calls`, terminated calls, newest first) for calls not yet seen. */
export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description:
    "The run gets each newly terminated Ringover call, taken from the call log newest first.",
  action: callList,
  input: () => ({ limitCount: 100 }),
  items: (result) => (result as { calls?: unknown[] }).calls ?? [],
  idOf: (item) => String((item as { cdr_id: number }).cdr_id),
  output: [
    { key: "cdr_id", type: "number", label: "Call record ID" },
    { key: "direction", type: "string", label: "Direction (in or out)" },
    { key: "last_state", type: "string", label: "Final call state" },
    { key: "from_number", type: "string", label: "Caller number" },
    { key: "to_number", type: "string", label: "Called number" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "total_duration", type: "number", label: "Total duration (s)" },
  ],
  sample: {
    cdr_id: 123456789,
    direction: "in",
    last_state: "ANSWERED",
    from_number: 33123456789,
    to_number: 33987654321,
    start_time: "2026-11-09T09:30:00.000Z",
    total_duration: 62,
  },
  maxPages: 1,
});
