import deviceList from "../actions/device-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-device",
  title: "New or Updated Device",
  description: "The run gets each new or updated Drata device.",
  action: deviceList,
  input: (_params, cursor) => ({ size: 500, ...(cursor ? { cursor } : {}) }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Workstation" } },
});
