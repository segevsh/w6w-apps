import { asArray, COMPANY_PARAM, requireId, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import employeeHomeAddressList from "../actions/employee-home-address-list.ts";
export default snapshotTrigger({
  key: "new-employee-home-address",
  title: "New Employee Home Address",
  description: "The run gets each home address record added for the chosen employee.",
  action: employeeHomeAddressList,
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
    { key: "uuid", type: "string", label: "Address UUID" },
    { key: "city", type: "string", label: "City" },
    { key: "state", type: "string", label: "State" },
    { key: "effective_date", type: "string", label: "Effective date" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: {
    uuid: "address-1",
    city: "San Francisco",
    state: "CA",
    effective_date: "2026-11-01",
    active: true,
  },
});
