import sequenceFolderList from "../actions/sequence-folder-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// GET /sequencefolders answers with every folder in one response (no paging or sort;
// https://developer.mixmax.com/reference/sequencefolders-get, verified 2026-11-10); diffed by id.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-sequence-folder",
  title: "New Sequence Folder",
  description: "The run gets each sequence folder that is newly created or shared with the user.",
  action: sequenceFolderList as never,
  input: () => ({}),
  output: [
    { key: "_id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { _id: "folder-sample-1", name: "Q4 campaigns" },
});
