import { boundedList } from "../lib/triggers.ts";
import roomFolderList from "../actions/room-folder-list.ts";

export default boundedList({
  key: "new-room-folder",
  title: "New Room Folder",
  description: "The run gets each folder newly created in one room.",
  action: roomFolderList as never,
  params: [{
    key: "roomId",
    label: "Room ID",
    type: "number",
    required: true,
    hint: "Numeric room ID, e.g. from List Rooms.",
  }],
  input: (p) => ({ roomId: p.roomId }),
  output: [{ key: "id", type: "string", label: "Folder ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],
  sample: { id: "f-1", name: "Q4 planning" },
});
