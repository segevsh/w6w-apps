import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/system-group-list.ts";

export default snapshotTrigger({
  key: "new-system-group",
  title: "New Device Group",
  description:
    "The run gets each device group newly created, polled from the existing `system-group-list` action (the whole collection, diffed by id).",
  action,
  idOf: (item) => item.id,
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { id: "5f0a1b2c3d4e5f6a7b8c9d13", name: "Laptops", type: "system_group" },
});
