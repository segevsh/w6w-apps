import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/user-sshkey-list.ts";

export default snapshotTrigger({
  key: "new-user-sshkey",
  title: "New User SSH Key",
  description:
    "The run gets each SSH key newly added to the chosen user, polled from the existing `user-sshkey-list` action (the user's whole key list, diffed by id).",
  action,
  input: (params) => ({ userId: params.userId }),
  idOf: (item) => item._id,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "_id", type: "string", label: "Key ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "public_key", type: "string", label: "Public key" },
    { key: "create_date", type: "string", label: "Created at" },
  ],
  sample: {
    _id: "5f0a1b2c3d4e5f6a7b8c9d15",
    name: "laptop",
    public_key: "ssh-ed25519 AAAAexample ada@example.com",
    create_date: "2026-11-09T10:00:00.000Z",
  },
});
