import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import companyList from "../actions/company-list.ts";

export default snapshotTrigger({
  key: "new-company",
  title: "New Company",
  description: "The run gets each newly created company in the account.",
  action: companyList as unknown as ActionDefinition,
  listKey: "companies",
  withCompany: false,
  output: [{ key: "id", type: "string", label: "Company ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "status", type: "string", label: "Status" }],
  sample: { id: "COM1", name: "Example Dental", status: "active" },
});
