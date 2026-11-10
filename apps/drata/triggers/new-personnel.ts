import personnelList from "../actions/personnel-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-personnel",
  title: "New or Updated Personnel",
  description: "The run gets each new or updated Drata personnel record.",
  action: personnelList,
  input: (_params, cursor) => ({ size: 500, ...(cursor ? { cursor } : {}) }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, email: "person@example.test" } },
});
