import servicedeskGetMany from "../actions/servicedesk-get-many.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-service-desk",
  title: "New Service Desk",
  description: "The run gets each service desk that appears in the connection's accessible set.",
  action: servicedeskGetMany,
  output: [
    { key: "id", type: "string", label: "Service desk ID" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "projectName", type: "string", label: "Project name" },
    { key: "projectKey", type: "string", label: "Project key" },
  ],
  sample: { id: "1", projectId: "10000", projectName: "IT Support", projectKey: "ITS" },
});
