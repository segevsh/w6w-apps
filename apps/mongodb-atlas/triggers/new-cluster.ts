import { PROJECT_ID_PARAM, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/cluster-list.ts";

export default snapshotTrigger({
  key: "new-cluster",
  title: "New Cluster",
  description:
    "The run gets each dedicated cluster newly created in the chosen project, polled from the existing `cluster-list` action (the whole list, diffed by cluster id).",
  action,
  listKey: "clusters",
  input: (params) => ({ projectId: params.projectId }),
  idOf: (item) => item.id ?? item.name,
  params: [PROJECT_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "Cluster ID" },
    { key: "name", type: "string", label: "Cluster name" },
    { key: "clusterType", type: "string", label: "Cluster type" },
    { key: "stateName", type: "string", label: "State" },
  ],
  sample: {
    id: "5f8d0d55b54eff0f2b2c3d51",
    name: "Cluster0",
    clusterType: "REPLICASET",
    stateName: "CREATING",
  },
});
