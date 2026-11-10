import riskList from "../actions/risk-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-risk",
  title: "New or Updated Risk",
  description: "The run gets each new or updated Drata risk in a risk register.",
  action: riskList,
  params: [{ key: "riskRegisterId", label: "Risk Register ID", type: "number", required: true }],
  input: (params, cursor) => ({
    riskRegisterId: params.riskRegisterId,
    size: 500,
    ...(cursor ? { cursor } : {}),
  }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, title: "Vendor risk" } },
});
