import vendorList from "../actions/vendor-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/vendors` through `vendor-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-vendor",
  title: "New Vendor",
  description: "The run gets each vendor newly added to the Vanta vendor inventory.",
  action: vendorList,
  listKey: "vendors",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Vendor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "websiteUrl", type: "string", label: "Website" },
  ],
  sample: {
    id: "vendor-1",
    name: "Example Cloud",
    status: "MANAGED",
    websiteUrl: "https://example.com",
  },
});
