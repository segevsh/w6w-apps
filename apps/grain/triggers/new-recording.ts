import { pollFromListAction } from "../../_shared/poll/mod.ts";
import recordingList from "../actions/recording-list.ts";

export default pollFromListAction({
  key: "new-recording",
  title: "New Recording",
  description: "The run gets each newly available meeting recording.",
  action: recordingList,
  input: () => ({}),
  items: (result) => (result as { recordings?: unknown[] }).recordings ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Recording ID" }],
  sample: { id: "recording-1" },
  maxPages: 1,
});
