import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/device-list.ts";

const trigger = pollFromListAction({
  key: "new-device",
  title: "New Device",
  description: "The run gets each newly visible device in the selected Balena fleet.",
  action,
  input: (params) => ({ ...params, limit: 1000 }),
  items: (result) => (result as { devices?: unknown[] }).devices ?? [],
  idOf: (item) =>
    String(
      (item as { id?: string | number; uuid?: string }).id ?? (item as { uuid?: string }).uuid,
    ),
  params: action.params,
  output: [{ key: "id", type: "number", label: "Device ID" }],
  sample: { id: 1, uuid: "device-uuid", device_name: "New device" },
  maxPages: 1,
});

export default trigger;
