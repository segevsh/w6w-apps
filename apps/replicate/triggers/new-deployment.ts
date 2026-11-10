import { pollFromListAction } from "../../_shared/poll/mod.ts";
import deploymentList from "../actions/deployment-list.ts";

/** `GET /deployments` is documented "sorted with the most recent deployment first". */
export default pollFromListAction({
  key: "new-deployment",
  title: "New Deployment",
  description: "The run gets each newly created deployment on the account.",
  action: deploymentList,
  input: () => ({ limit: 100, returnAll: false }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const d = item as { owner?: unknown; name?: unknown };
    return d.owner && d.name ? `${d.owner}/${d.name}` : "";
  },
  output: [
    { key: "owner", type: "string", label: "Owner" },
    { key: "name", type: "string", label: "Deployment name" },
    { key: "current_release", type: "object", label: "Current release" },
  ],
  sample: {
    owner: "example-owner",
    name: "example-deployment",
    current_release: { number: 1, model: "example-owner/example-model", version: "version-1" },
  },
  maxPages: 1,
});
