import { asArray, COMPANY_PARAM, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import departmentList from "../actions/department-list.ts";

export default snapshotTrigger({
  key: "new-department",
  title: "New Department",
  description: "The run gets each department created since the last check.",
  action: departmentList,
  params: [COMPANY_PARAM],
  input: (p) => ({ companyId: p.companyId, returnAll: true }),
  items: asArray,
  idOf: uuidOf,
  updated: false,
  output: [
    { key: "uuid", type: "string", label: "Department UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "version", type: "string", label: "Version" },
  ],
  sample: { uuid: "department-1", title: "Support", version: "v1" },
});
