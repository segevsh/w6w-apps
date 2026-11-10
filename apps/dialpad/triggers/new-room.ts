import { snapshotTrigger } from "../lib/triggers.ts";
import roomsList from "../actions/rooms-list.ts";

export default snapshotTrigger({
  key: "new-room",
  title: "New Room",
  description: "The run gets each Dialpad room newly created in the company.",
  action: roomsList,
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "name", type: "string", label: "Room name" },
    { key: "office_id", type: "string", label: "Office ID" },
    { key: "state", type: "string", label: "Room state" },
  ],
  sample: { id: "8001", name: "Lobby", office_id: "5001", state: "active" },
});
