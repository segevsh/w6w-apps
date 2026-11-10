import { pollFromListAction } from "../../_shared/poll/mod.ts";
import entryList from "../actions/entry-list.ts";
import { idOf, itemsAt } from "../lib/triggers.ts";

/**
 * Wraps `entry-list` with `sort: "lastSaved"`. Canny: "\"created\", \"lastSaved\", and
 * \"publishedAt\" return the most recent first by that date"
 * (https://developers.canny.io/api-reference, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-changelog-entry",
  title: "New or Updated Changelog Entry",
  description:
    "The run gets each newly created Canny changelog entry and each entry saved again (sorted by last-saved date, most recent first).",
  action: entryList,
  input: () => ({ sort: "lastSaved", limit: 100 }),
  items: itemsAt("entries"),
  idOf: (item) => `${idOf(item)}:${(item as { lastSaved?: unknown }).lastSaved ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Entry ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Type" },
    { key: "created", type: "string", label: "Created at" },
    { key: "lastSaved", type: "string", label: "Last saved at" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d16",
    title: "Dark mode is here",
    type: "new",
    created: "2026-11-09T09:00:00.000Z",
    lastSaved: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
