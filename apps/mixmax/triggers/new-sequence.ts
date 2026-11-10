import sequenceList from "../actions/sequence-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /sequences is "up to 100 per page" with a `next` cursor and documents no sort
// (https://developer.mixmax.com/reference/sequences), so there is no newest-first page: each check
// follows `next` through up to 20 pages of 100 and diffs the ids, and throws past 2,000 sequences.
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
  paged: { limit: 100, maxPages: 20 },
  output: [
    { key: "_id", type: "string", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { _id: "sequence-sample-1", name: "Outbound intro" },
});
