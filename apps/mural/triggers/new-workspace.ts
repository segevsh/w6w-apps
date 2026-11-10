import { boundedList } from "../lib/triggers.ts";
import workspaceList from "../actions/workspace-list.ts";

export default boundedList({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace the authenticated user newly gains access to.",
  action: workspaceList as never,
  output: [{ key: "id", type: "string", label: "Workspace ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "url", type: "string", label: "URL" }],
  sample: { id: "ws12345", name: "Product team" },
});
