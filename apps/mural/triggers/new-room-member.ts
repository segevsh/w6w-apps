import { boundedList } from "../lib/triggers.ts";
import roomMemberList from "../actions/room-member-list.ts";

export default boundedList({
  key: "new-room-member",
  title: "New Room Member",
  description: "The run gets each user newly added to one room.",
  action: roomMemberList as never,
  params: [{
    key: "roomId",
    label: "Room ID",
    type: "number",
    required: true,
    hint: "Numeric room ID, e.g. from List Rooms.",
  }],
  input: (p) => ({ roomId: p.roomId }),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "u-1", firstName: "Ana", lastName: "Silva", email: "ana@example.com" },
});
