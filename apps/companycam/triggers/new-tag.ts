import type { ActionDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/tags` lists the company's tags, a small bounded vocabulary, so each check snapshots all
// pages (brief 9.1c).
export default snapshotTrigger<Record<string, never>>({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each newly created tag.",
  action: tagList as unknown as ActionDefinition,
  input: () => ({}),
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
