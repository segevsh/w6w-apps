import riskRegisterList from "../actions/risk-register-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-risk-register",
  title: "New or Updated Risk Register",
  description: "The run gets each new or updated Drata risk register.",
  action: riskRegisterList,
  input: (_params, cursor) => ({ size: 500, ...(cursor ? { cursor } : {}) }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Enterprise risks" } },
});
