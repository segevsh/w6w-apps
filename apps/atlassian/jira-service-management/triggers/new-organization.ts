import organizationGetMany from "../actions/organization-get-many.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each organization that appears in the connection's accessible set.",
  action: organizationGetMany,
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "1", name: "Acme Corp" },
});
