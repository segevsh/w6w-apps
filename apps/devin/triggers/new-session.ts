import { sessionPoll } from "../lib/triggers.ts";

export default sessionPoll({
  key: "new-session",
  title: "New Session",
  description: "The run gets each Devin session created since the last check.",
  filter: "createdAfter",
  idOf: (s) => String(s.session_id ?? ""),
});
