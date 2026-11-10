import { snapshotList } from "../lib/snapshot.ts";
import { CONTRACT_PARAM } from "../lib/params.ts";
import contractMilestoneList from "../actions/contract-milestone-list.ts";

export default snapshotList<{ contractId: string }>({
  key: "new-contract-milestone",
  title: "New Contract Milestone",
  description: "The run gets each new milestone on the chosen milestone-based contract.",
  params: [CONTRACT_PARAM],
  action: contractMilestoneList,
  input: (p) => ({ contractId: p.contractId }),
  output: [
    { key: "id", type: "string", label: "Milestone ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "m1", title: "Phase 1", status: "pending" },
});
