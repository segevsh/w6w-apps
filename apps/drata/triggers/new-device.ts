import { pollFromListAction } from "../../_shared/poll/mod.ts";
import deviceList from "../actions/device-list.ts";

export default pollFromListAction({
  key: "new-device",
  title: "New Device",
  description: "The run gets each new device.",
  action: deviceList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Device ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
