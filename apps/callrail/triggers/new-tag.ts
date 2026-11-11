import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";

export default snapshotTrigger({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each newly created tag.",
  action: tagList as unknown as ActionDefinition,
  listKey: "tags",
  withCompany: true,
  output: [{ key: "id", type: "number", label: "Tag ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "tag_level", type: "string", label: "Tag level" }],
  sample: { id: 101, name: "Qualified", tag_level: "company" },
});
