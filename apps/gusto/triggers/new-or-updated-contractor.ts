import { asArray, COMPANY_PARAM, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import contractorList from "../actions/contractor-list.ts";

export default snapshotTrigger({
  key: "new-or-updated-contractor",
  title: "New or Updated Contractor",
  description:
    "The run gets each contractor that is new or whose record changed since the last check.",
  action: contractorList,
  params: [COMPANY_PARAM],
  input: (p) => ({ companyId: p.companyId, returnAll: true }),
  items: asArray,
  idOf: uuidOf,
  updated: true,
  output: [
    { key: "uuid", type: "string", label: "Contractor UUID" },
    { key: "type", type: "string", label: "Individual or Business" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "business_name", type: "string", label: "Business name" },
    { key: "is_active", type: "boolean", label: "Active" },
    { key: "version", type: "string", label: "Version" },
  ],
  sample: {
    uuid: "contractor-1",
    type: "Individual",
    first_name: "Grace",
    last_name: "Hopper",
    is_active: true,
    version: "v1",
  },
});
