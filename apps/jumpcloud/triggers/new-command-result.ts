import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/command-result-list.ts";

export default pollFromListAction({
  key: "new-command-result",
  title: "New Command Result",
  description:
    "The run gets each newly reported command result, oldest first, polled from the existing `command-result-list` action sorted by `requestTime` descending (`sort=-requestTime`).",
  action,
  input: () => ({ sort: "-requestTime", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { _id?: unknown })._id),
  output: [
    { key: "_id", type: "string", label: "Result ID" },
    { key: "name", type: "string", label: "Command name" },
    { key: "workflowId", type: "string", label: "Command ID" },
    { key: "systemId", type: "string", label: "Device ID" },
    { key: "requestTime", type: "string", label: "Requested at" },
    { key: "response", type: "object", label: "Response (exit code, output)" },
  ],
  sample: {
    _id: "5f0a1b2c3d4e5f6a7b8c9d10",
    name: "Restart agent",
    workflowId: "5f0a1b2c3d4e5f6a7b8c9d11",
    systemId: "5f0a1b2c3d4e5f6a7b8c9d0f",
    requestTime: "2026-11-09T10:00:00.000Z",
    response: { data: { exitCode: 0, output: "ok" } },
  },
  maxPages: 1,
});
