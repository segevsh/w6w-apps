import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/command-list.ts";

export default snapshotTrigger({
  key: "new-command",
  title: "New Command",
  description:
    "The run gets each saved command newly added to the organization, polled from the existing `command-list` action (the whole collection, diffed by id).",
  action,
  idOf: (item) => item._id,
  output: [
    { key: "_id", type: "string", label: "Command ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "command", type: "string", label: "Script body" },
    { key: "commandType", type: "string", label: "Command type" },
  ],
  sample: {
    _id: "5f0a1b2c3d4e5f6a7b8c9d11",
    name: "Restart agent",
    command: "systemctl restart jcagent",
    commandType: "linux",
  },
});
