import { PROJECT_ID_PARAM, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/flex-cluster-list.ts";

export default snapshotTrigger({
  key: "new-flex-cluster",
  title: "New Flex Cluster",
  description:
    "The run gets each flex cluster newly created in the chosen project, polled from the existing `flex-cluster-list` action (the whole list, diffed by cluster id).",
  action,
  listKey: "clusters",
  input: (params) => ({ projectId: params.projectId }),
  idOf: (item) => item.id ?? item.name,
  params: [PROJECT_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "Cluster ID" },
    { key: "name", type: "string", label: "Cluster name" },
    { key: "stateName", type: "string", label: "State" },
  ],
  sample: { id: "5f8d0d55b54eff0f2b2c3d52", name: "Flex0", stateName: "CREATING" },
});
