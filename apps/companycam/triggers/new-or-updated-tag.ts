import type { ActionDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// Same snapshot as `new-tag`; a renamed tag is an event too (brief 9.2).
export default snapshotTrigger<Record<string, never>>({
  key: "new-or-updated-tag",
  title: "New or Updated Tag",
  description: "The run gets each tag that was created or renamed.",
  action: tagList as unknown as ActionDefinition,
  input: () => ({}),
  updated: true,
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Value" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "2001",
    display_value: "Roof",
    value: "roof",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
