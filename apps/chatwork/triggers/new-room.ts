import { snapshotTrigger } from "../lib/triggers.ts";
import roomList from "../actions/room-list.ts";

export default snapshotTrigger({
  key: "new-room",
  title: "New Chat",
  description:
    "The run gets each chat the connected account newly belongs to (it created or was added to it).",
  action: roomList,
  input: () => ({}),
  idKey: "room_id",
  output: [
    { key: "room_id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Chat name" },
    { key: "type", type: "string", label: "my | direct | group" },
    { key: "role", type: "string", label: "My role: admin | member | readonly" },
    { key: "sticky", type: "boolean", label: "Pinned" },
    { key: "unread_num", type: "number", label: "Unread messages" },
    { key: "message_num", type: "number", label: "Total messages" },
    { key: "last_update_time", type: "number", label: "Last update (Unix seconds)" },
  ],
  sample: {
    room_id: 100200,
    name: "Project Alpha",
    type: "group",
    role: "admin",
    sticky: false,
    unread_num: 0,
    message_num: 42,
    last_update_time: 1794128400,
  },
});
