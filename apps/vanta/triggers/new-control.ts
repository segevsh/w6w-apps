import controlList from "../actions/control-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/controls` through `control-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-control",
  title: "New Control",
  description: "The run gets each control newly added to the Vanta program.",
  action: controlList,
  listKey: "controls",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Control ID" },
    { key: "externalId", type: "string", label: "External ID" },
    { key: "source", type: "string", label: "Source" },
  ],
  sample: { id: "control-1", externalId: "AC-1", source: "VANTA" },
});
