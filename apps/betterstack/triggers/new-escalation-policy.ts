import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import escalationPolicyList from "../actions/escalation-policy-list.ts";

export default snapshotList({
  key: "new-escalation-policy",
  title: "New Escalation Policy",
  description: "The run gets each newly created escalation policy.",
  action: escalationPolicyList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Policy ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "repeat_count", type: "number", label: "Repeat count" },
  ],
  sample: { id: "4001", type: "policy", name: "Policy A", repeat_count: 5 },
});
