import { pollFromListAction } from "../../_shared/poll/mod.ts";
import transcriptList from "../actions/transcript-list.ts";

export default pollFromListAction({
  key: "new-transcript",
  title: "New Transcript",
  description: "The run gets each newly submitted transcript.",
  action: transcriptList,
  input: () => ({ limit: 100 }),
  items: (result) => {
    const transcripts = (result as { transcripts?: unknown }).transcripts;
    return Array.isArray(transcripts) ? transcripts : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Transcript ID" }],
  sample: { id: "tr_001" },
  maxPages: 1,
});
