import sequenceList from "../actions/sequence-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /sequences answers with every sequence the user can access in one response (no paging, no
// sort; https://developer.mixmax.com/reference/sequences-get, verified 2026-11-10), so each check
// reads it whole and diffs the ids.
export default snapshotTrigger<{ folder?: string }>({
  key: "new-sequence",
  title: "New Sequence",
  description:
    "The run gets each sequence that newly becomes accessible (optionally in one folder).",
  action: sequenceList as never,
  params: [{
    key: "folder",
    label: "Folder ID",
    type: "string",
    hint: "Only sequences in this folder. Leave empty for every sequence you can access.",
  }],
  input: (p) => ({ folder: p.folder || undefined }),
  output: [
    { key: "_id", type: "string", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { _id: "sequence-sample-1", name: "Outbound intro" },
});
