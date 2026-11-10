import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

// `call-list` is documented as "reverse-chronological order by call start time (i.e. recent calls
// first)" and only lists calls that have concluded (https://developers.dialpad.com/reference/calllist).
export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each call that has concluded since the last check.",
  action: callList,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { call_id?: unknown }).call_id ?? ""),
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "state", type: "string", label: "State" },
    { key: "date_started", type: "number", label: "Started (ms since epoch)" },
  ],
  sample: {
    call_id: "4503599627370496",
    direction: "inbound",
    state: "hangup",
    date_started: 1762646400000,
  },
  maxPages: 1,
});
