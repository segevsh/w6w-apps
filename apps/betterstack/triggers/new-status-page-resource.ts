import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import statusPageResourceList from "../actions/status-page-resource-list.ts";

export default snapshotList<{ status_page_id: string }>({
  key: "new-status-page-resource",
  title: "New Status Page Resource",
  description: "The run gets each resource newly added to the chosen status page.",
  params: [{ key: "status_page_id", label: "Status page ID", type: "string", required: true }],
  action: statusPageResourceList,
  input: ({ status_page_id }, page) => ({ status_page_id, page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Resource ID" },
    { key: "public_name", type: "string", label: "Public name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "9001",
    type: "status_page_resource",
    public_name: "Website",
    status: "operational",
  },
});
