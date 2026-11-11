import { boundedList } from "../lib/triggers.ts";
import roomList from "../actions/room-list.ts";

export default boundedList({
  key: "new-room",
  title: "New Room",
  description: "The run gets each room newly created in one workspace.",
  action: roomList as never,
  params: [{
    key: "workspaceId",
    label: "Workspace ID",
    type: "string",
    required: true,
    hint: "The workspace to watch, e.g. from List Workspaces.",
  }],
  input: (p) => ({ workspaceId: p.workspaceId }),
  output: [{ key: "id", type: "number", label: "Room ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "workspaceId", type: "string", label: "Workspace ID" }],
  sample: { id: 4501, name: "Roadmap", workspaceId: "ws12345" },
});
