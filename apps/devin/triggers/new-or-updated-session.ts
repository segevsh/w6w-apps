import { sessionPoll } from "../lib/triggers.ts";

export default sessionPoll({
  key: "new-or-updated-session",
  title: "New or Updated Session",
  description: "The run gets each Devin session that was created or changed since the last check.",
  filter: "updatedAfter",
  idOf: (s) => `${s.session_id ?? ""}:${s.updated_at ?? ""}`,
});
