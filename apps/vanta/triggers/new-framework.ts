import frameworkList from "../actions/framework-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/frameworks` through `framework-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-framework",
  title: "New Framework",
  description: "The run gets each compliance framework newly added to the Vanta program.",
  action: frameworkList,
  listKey: "frameworks",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Framework ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "shorthandName", type: "string", label: "Short name" },
  ],
  sample: { id: "soc2", displayName: "SOC 2", shorthandName: "SOC 2" },
});
