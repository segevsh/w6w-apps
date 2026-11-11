import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listItems from "../actions/list-items.ts";

export default chargebeeTrigger({
  key: "new-or-updated-item",
  title: "New or Updated Item",
  description: "The run gets each item when it is created and each time it is updated.",
  action: listItems as ActionDefinition,
  wrapper: "item",
  sortAttribute: "updated_at",
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "basic-plan",
    name: "Basic plan",
    type: "plan",
    status: "active",
    updated_at: 1762689600,
  },
});
