import vendorList from "../actions/vendor-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-vendor",
  title: "New or Updated Vendor",
  description: "The run gets each new or updated Drata vendor.",
  action: vendorList,
  input: (_params, cursor) => ({ size: 500, ...(cursor ? { cursor } : {}) }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Example Vendor" } },
});
