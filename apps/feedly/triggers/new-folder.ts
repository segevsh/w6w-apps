import type { ActionDefinition } from "@w6w/types";
import foldersList from "../actions/folders-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v3/enterprise/collections` returns the team's folders in one response (no paging in the
 * reference), so each check diffs the ids. Archived folders are left out (the action default).
 * https://developers.feedly.com/llms.txt (Folders: "Get all team folders") */
export default snapshotTrigger({
  key: "new-folder",
  title: "New Folder",
  description: "The run gets each team folder newly created in Feedly.",
  action: foldersList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { folders?: unknown[] }).folders ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Folder stream ID" },
    { key: "label", type: "string", label: "Name" },
    { key: "feeds", type: "array", label: "Member feeds" },
  ],
  sample: { id: "enterprise/acme/category/c1", label: "Threat actors", feeds: [] },
});
