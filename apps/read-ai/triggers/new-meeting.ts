import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listMeetings from "../actions/list-meetings.ts";

/** Read AI's one-page meetings endpoint is explicitly newest first and capped at ten rows. */
export default pollFromListAction({
  key: "new-meeting",
  title: "New Meeting",
  description: "The run gets each newly available meeting report.",
  action: listMeetings,
  input: () => ({ limit: 10 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Meeting ID" }],
  sample: { id: "meeting_123", title: "Project review" },
  maxPages: 1,
});
