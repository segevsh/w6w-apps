import clientCompanyList from "../actions/client-company-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-client-company",
  title: "New Client Company",
  description: "The run gets each client company newly attached to your reseller account.",
  action: clientCompanyList,
  output: [
    { key: "uuid", type: "string", label: "Company UUID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { uuid: "3f2b9c1e-0000-4000-8000-000000000001", name: "Acme Inc" },
});
