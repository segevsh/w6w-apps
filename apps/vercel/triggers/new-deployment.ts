import { pollFromListAction } from "../../_shared/poll/mod.ts";
import deploymentList from "../actions/deployment-list.ts";

export default pollFromListAction({
  key: "new-deployment",
  title: "New Deployment",
  description: "The run gets each newly created deployment.",
  action: deploymentList,
  input: () => ({ limit: 100 }),
  items: (r) => Array.isArray(r) ? r : (r as { deployments?: unknown[] }).deployments ?? [],
  idOf: (i) =>
    String((i as { uid?: unknown; id?: unknown }).uid ?? (i as { id?: unknown }).id ?? ""),
  output: [{ key: "uid", type: "string", label: "Deployment ID" }],
  sample: { uid: "sample-id" },
  maxPages: 1,
});
