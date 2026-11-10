import { asArray, COMPANY_PARAM, requireId, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import garnishmentList from "../actions/garnishment-list.ts";
export default snapshotTrigger({
  key: "new-garnishment",
  title: "New Garnishment",
  description: "The run gets each garnishment added for the chosen employee.",
  action: garnishmentList,
  params: [{
    key: "employeeId",
    label: "Employee ID",
    type: "string",
    required: true,
    default: "",
    hint: "The employee UUID to watch.",
  }],
  input: (p) => ({ employeeId: requireId(p.employeeId, "employeeId"), returnAll: true }),
  items: asArray,
  idOf: uuidOf,
  updated: false,
  output: [
    { key: "uuid", type: "string", label: "Garnishment UUID" },
    { key: "description", type: "string", label: "Description" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "court_ordered", type: "boolean", label: "Court ordered" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: {
    uuid: "garnishment-1",
    description: "Child support",
    amount: "100.00",
    court_ordered: true,
    active: true,
  },
});
