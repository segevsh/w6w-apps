import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/device-list.ts";

export default pollFromListAction({
  key: "new-device",
  title: "New Device",
  description: "The run gets each newly claimed device.",
  action,
  input: () => ({ perPage: 100, page: 1 }),
  items: (r) => (r as { devices?: unknown[] }).devices ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Device ID" }],
  sample: { id: "device-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
