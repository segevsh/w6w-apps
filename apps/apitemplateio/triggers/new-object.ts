import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listObjects from "../actions/list-objects.ts";

export default pollFromListAction({
  key: "new-object",
  title: "New Generated Object",
  description: "The run gets each newly generated PDF or image object.",
  action: listObjects,
  input: () => ({ limit: 100, offset: 0 }),
  items: (result) => {
    const objects = (result as { objects?: unknown }).objects;
    return Array.isArray(objects) ? objects : [];
  },
  idOf: (item) => String((item as { transaction_ref?: unknown }).transaction_ref ?? ""),
  output: [{ key: "transaction_ref", type: "string", label: "Transaction reference" }],
  sample: { transaction_ref: "txn_001" },
  maxPages: 1,
});
