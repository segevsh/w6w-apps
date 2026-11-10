import policyList from "../actions/policy-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/policies` through `policy-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-policy",
  title: "New Policy",
  description: "The run gets each policy newly added to Vanta.",
  action: policyList,
  listKey: "policies",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Policy ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "approvedAtDate", type: "string", label: "Approved at" },
  ],
  sample: { id: "policy-1", status: "APPROVED", approvedAtDate: "2026-11-01T00:00:00Z" },
});
