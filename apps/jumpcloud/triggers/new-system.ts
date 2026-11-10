import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/system-list.ts";

export default pollFromListAction({
  key: "new-system",
  title: "New Device",
  description:
    "The run gets each newly enrolled device, oldest first, polled from the existing `system-list` action sorted by `created` descending (`sort=-created`).",
  action,
  input: () => ({ sort: "-created", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { _id?: unknown })._id),
  output: [
    { key: "_id", type: "string", label: "Device ID" },
    { key: "hostname", type: "string", label: "Hostname" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "os", type: "string", label: "Operating system" },
    { key: "created", type: "string", label: "Enrolled at" },
  ],
  sample: {
    _id: "5f0a1b2c3d4e5f6a7b8c9d0f",
    hostname: "ada-laptop",
    displayName: "Ada's laptop",
    os: "Mac OS X",
    created: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
