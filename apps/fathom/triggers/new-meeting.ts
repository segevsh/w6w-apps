import { pollFromListAction } from "../../_shared/poll/mod.ts";
import meetingGetMany from "../actions/meeting-get-many.ts";

export default pollFromListAction({
  key: "new-meeting",
  title: "New Meeting",
  description: "The run gets each newly created meeting.",
  action: meetingGetMany,
  input: () => ({ createdAfter: "1970-01-01T00:00:00Z" }),
  items: (result) =>
    Array.isArray((result as { items?: unknown[] }).items)
      ? (result as { items: unknown[] }).items
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Meeting ID" }],
  sample: { id: "meeting-1" },
  maxPages: 1,
});
