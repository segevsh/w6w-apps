import type { ActionDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { idField, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /tags` documents no query parameters; an organization's tags fit one response. */
export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each newly created tag (for issues, accounts or articles).",
  action: tagList as unknown as ActionDefinition,
  paged: false,
  input: () => ({}),
  items: (result) => (result as { tags?: unknown[] }).tags ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "value", type: "string", label: "Tag name" },
    { key: "object_type", type: "string", label: "Applies to" },
    { key: "hex_color", type: "string", label: "Colour" },
  ],
  sample: { id: "tag_1", value: "vip", object_type: "account", hex_color: "#ff0000" },
});
