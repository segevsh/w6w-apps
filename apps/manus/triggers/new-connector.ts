import type { ActionDefinition } from "@w6w/types";
import { wholeListSnapshot } from "../lib/triggers.ts";
import connectorList from "../actions/connector-list.ts";

/** The vendor returns this list whole, unpaginated and unsorted, so it is diffed by id (added rows only). */
export default wholeListSnapshot({
  key: "new-connector",
  title: "New Connector",
  description: "The run gets each newly installed connector: id, name, type and category.",
  action: connectorList as unknown as ActionDefinition,
  output: [
    { key: "id", type: "string", label: "Connector ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "category", type: "string", label: "Category" },
  ],
  sample: { id: "connector-1", name: "Notion", type: "builtin", category: "productivity" },
});
